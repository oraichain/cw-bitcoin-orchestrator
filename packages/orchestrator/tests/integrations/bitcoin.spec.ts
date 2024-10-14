import { ExecuteResult, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { coin, GasPrice } from '@cosmjs/stargate';
import { AppBitcoinClient } from '@oraichain/bitcoin-bridge-contracts-sdk';
import { LightClientBitcoinClient } from '@oraichain/bitcoin-bridge-contracts-sdk/build/LightClientBitcoin.client';
import { encodeXpub, toBinaryBlockHeader } from '@oraichain/bitcoin-bridge-wasm-sdk';
import { RPCClient } from '@oraichain/rpc-bitcoin';
import BIP32Factory from 'bip32';
import * as btc from 'bitcoinjs-lib';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { setTimeout } from 'timers/promises';
import * as ecc from 'tiny-secp256k1';
import { BitcoinBlock } from '../../src/@types';
import { logger } from '../../src/configs/logger';
import { DuckDbNode } from '../../src/services/db';
import RelayerService from '../../src/services/relayer';
import SignerService from '../../src/services/signer';
import TriggerBlocks from '../../src/trigger_block';
import { convertToOtherAddress, initSignerClient, wrappedExecuteTransaction } from '../../src/utils/cosmos';
import { initBitcoinContract, initOsorContract } from './_init';

async function moveNextCheckpoint(currentCheckpointIndex: number, btcClient: RPCClient, relayerService: RelayerService, appBitcoinClient: AppBitcoinClient, triggerClient: TriggerBlocks, walletAddress: string, walletName: string) {
  let depositAddress = await relayerService.generateDepositAddress(
    currentCheckpointIndex,
    {
      address: 'orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd'
    },
    btc.networks.regtest
  );
  await relayerService.submitDepositAddress(depositAddress, 0, {
    address: 'orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd'
  });
  await btcClient.sendtoaddress({
    address: depositAddress,
    amount: '0.5'
  });
  while (true) {
    const index = await appBitcoinClient.buildingIndex();
    if (index == currentCheckpointIndex + 1) {
      console.log(`Relayed deposit successfully on checkpoint ${currentCheckpointIndex + 1}`);
      break;
    }
    await btcClient.generatetoaddress({ address: walletAddress, nblocks: 1 }, walletName);
    await wrappedExecuteTransaction(async () => {
      await triggerClient.triggerBlocks();
    }, logger('moveNextCheckpoint'));
    await setTimeout(1000);
  }
}
describe('Test bitcoin integration', () => {
  let mnemonics = [
    'rough minor raise pelican rate dog camera fold scissors asthma tuition gaze silver mom borrow bicycle produce witness forest blush law arctic name issue',
    'ski office crowd wine fabric digital cricket toward ripple tattoo live amount',
    'oak nerve twelve butter flee forum obscure off sibling bar miracle switch'
  ];
  let validatorKeys: [string, string][] = [];
  let lightClientBitcoinClients: LightClientBitcoinClient[] = [];
  let appBitcoinClients: AppBitcoinClient[] = [];
  let relayerServices: RelayerService[] = [];
  let signerServices: SignerService[] = [];
  let triggerServices: TriggerBlocks[] = [];
  let clients: SigningCosmWasmClient[] = [];
  let clientAddresses: string[] = [];
  let btcClient: RPCClient;
  let entryPointAddress: string;
  let lightClientBitcoinAddress: string;
  let appBitcoinAddress: string;
  let tokenFactoryAddress: string;
  let walletName: string;
  let walletAddress: string;
  let userClient: SigningCosmWasmClient;
  let userAddress: string;

  beforeAll(async () => {
    fs.rmSync(path.join(__dirname, 'testdata/data/regtest'), {
      recursive: true,
      force: true
    });

    await DuckDbNode.create();
    await DuckDbNode.instances.createTable();
    btcClient = new RPCClient({
      port: 18443,
      host: 'http://127.0.0.1',
      user: 'satoshi',
      pass: 'nakamoto'
    });

    const { sender: uAddress, client: uClient } = await initSignerClient('http://127.0.0.1:26657', mnemonics[mnemonics.length - 1], 'orai', GasPrice.fromString('0.002orai'));
    userClient = uClient;
    userAddress = uAddress;

    const { sender, client } = await initSignerClient('http://127.0.0.1:26657', mnemonics[0], 'orai', GasPrice.fromString('0.002orai'));
    const { entryPointAddress: epAddress } = await initOsorContract(client, sender);
    entryPointAddress = epAddress;
    const { lightClientBitcoinAddress: lcAddress, appBitcoinAddress: aAddress, tokenFactoryAddress: tfAddress } = await initBitcoinContract(client, sender, entryPointAddress);
    lightClientBitcoinAddress = lcAddress;
    appBitcoinAddress = aAddress;
    tokenFactoryAddress = tfAddress;

    const bip32 = BIP32Factory(ecc);
    for (let i = 0; i < 2; i++) {
      const { sender, client } = await initSignerClient('http://127.0.0.1:26657', mnemonics[i], 'orai', GasPrice.fromString('0.002orai'));
      const seed = crypto.randomBytes(32);
      const node = bip32.fromSeed(seed, btc.networks.bitcoin);
      const xpriv = node.toBase58();
      const xpub = node.neutered().toBase58();
      validatorKeys.push([xpriv, xpub]);

      lightClientBitcoinClients.push(new LightClientBitcoinClient(client, sender, lightClientBitcoinAddress));
      appBitcoinClients.push(new AppBitcoinClient(client, sender, appBitcoinAddress));
      signerServices.push(
        new SignerService(
          lightClientBitcoinClients[i],
          appBitcoinClients[i],
          'bitcoin' // use bitcoin key to signing for regtest transaction
        )
      );
      relayerServices.push(new RelayerService(btcClient, lightClientBitcoinClients[i], appBitcoinClients[i], DuckDbNode.instances, 'regtest'));
      triggerServices.push(new TriggerBlocks(appBitcoinClients[i]));
      clients.push(client);
      clientAddresses.push(sender);

      if (i == 0) {
        RelayerService.instances = relayerServices[i];

        // fix to create or get wallet
        walletName = (
          await btcClient.createwallet({
            wallet_name: 'bridger',
            avoid_reuse: true
          })
        ).name;
        walletAddress = await btcClient.getnewaddress({}, walletName);

        // update trusted height
        for (let i = 0; i < 5; i++) {
          await btcClient.generatetoaddress({ address: walletAddress, nblocks: 200 }, walletName);
        }

        let blockHash = await btcClient.getbestblockhash();
        let blockInfo: BitcoinBlock = await btcClient.getblock({
          blockhash: blockHash,
          verbosity: 2
        });

        let tx;

        let cpConfig = await appBitcoinClients[i].checkpointConfig();
        tx = await appBitcoinClients[i].updateCheckpointConfig({
          config: {
            ...cpConfig,
            min_checkpoint_interval: 1
          }
        });
        console.log(`Updated checkpoint config at ${tx.transactionHash}`);

        tx = await lightClientBitcoinClients[i].updateHeaderConfig({
          config: {
            max_length: 2000,
            max_time_increase: 8 * 60 * 60,
            trusted_height: blockInfo.height,
            retarget_interval: 2016,
            target_spacing: 10 * 60,
            target_timespan: 2016 * (10 * 60),
            max_target: 0x1d00ffff,
            retargeting: true,
            min_difficulty_blocks: false,
            trusted_header: Buffer.from(
              toBinaryBlockHeader({
                version: blockInfo.version,
                prev_blockhash: blockInfo.previousblockhash,
                merkle_root: blockInfo.merkleroot,
                time: blockInfo.time,
                bits: parseInt(blockInfo.bits, 16),
                nonce: blockInfo.nonce
              })
            ).toString('base64')
          }
        });
        console.log(`Updated header at ${tx.transactionHash}`);

        tx = await appBitcoinClients[i].registerDenom(
          {
            subdenom: 'obtc'
          },
          'auto',
          '',
          [coin('10000000', 'orai')]
        );
        console.log('Register denom at:', tx.transactionHash);

        tx = await appBitcoinClients[0].registerValidator();
        console.log(`Register validator at: ${tx.transactionHash}`);

        tx = await appBitcoinClients[0].setSignatoryKey({
          xpub: encodeXpub({ key: xpub })
        });
        console.log(`Setting signatory key at: ${tx.transactionHash}`);
      }
    }
  }, 120_000);

  it('Testing relay header', async () => {
    relayerServices[0].relayHeader();
    await btcClient.generatetoaddress({ address: walletAddress, nblocks: 200 }, walletName);
    while (true) {
      const height = await lightClientBitcoinClients[0].headerHeight();
      console.log(height);
      if (height == 1200) {
        console.log('Relayed headers successfully');
        break;
      }
      await setTimeout(100);
    }
  }, 1000_000_000);

  it('Testing relay deposit', async () => {
    Promise.all([
      relayerServices[0].relay(),
      signerServices[0].startRelay({
        xpriv: validatorKeys[0][0],
        xpub: validatorKeys[0][1]
      })
    ]);
    await triggerServices[0].triggerBlocks();
    let presentVotingPower = (await appBitcoinClients[0].buildingCheckpoint()).sigset.present_vp;
    expect(presentVotingPower).toBe(500_000_000);
    let depositAddress = await relayerServices[0].generateDepositAddress(
      0,
      {
        address: 'orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd'
      },
      btc.networks.regtest
    );
    await relayerServices[0].submitDepositAddress(depositAddress, 0, {
      address: 'orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd'
    });
    await btcClient.sendtoaddress({
      address: depositAddress,
      amount: '0.5'
    });
    while (true) {
      const index = await appBitcoinClients[0].buildingIndex();
      if (index == 1) {
        console.log('Relayed deposit successfully');
        let checkpoint = await appBitcoinClients[0].buildingCheckpoint();
        expect(checkpoint.sigset.present_vp).toBe(500_000_000);
        break;
      }
      await btcClient.generatetoaddress({ address: walletAddress, nblocks: 1 }, walletName);
      await wrappedExecuteTransaction(async () => {
        await triggerServices[0].triggerBlocks();
      }, logger('Testing relay deposit'));
      await setTimeout(1000);
    }

    // Update voting power, this will be effected on checkpoint building 2
    await clients[0].sendTokens(clientAddresses[0], userAddress, [coin('120000000', 'orai')], 'auto', '');
    await userClient.delegateTokens(userAddress, convertToOtherAddress(clientAddresses[0]), coin('100000000', 'orai'), 'auto', '');
    await moveNextCheckpoint(1, btcClient, relayerServices[0], appBitcoinClients[0], triggerServices[0], walletAddress, walletName);
    await btcClient.sendtoaddress({
      address: depositAddress,
      amount: '0.5'
    });
    while (true) {
      const index = await appBitcoinClients[0].buildingIndex();
      if (index == 3) {
        console.log('Relayed deposit successfully');
        let checkpoint = await appBitcoinClients[0].buildingCheckpoint();
        expect(checkpoint.sigset.present_vp).toBe(600_000_000);
        break;
      }
      await btcClient.generatetoaddress({ address: walletAddress, nblocks: 1 }, walletName);
      await wrappedExecuteTransaction(async () => {
        await triggerServices[0].triggerBlocks();
      }, logger('Testing relay deposit'));
      await setTimeout(1000);
    }

    // Add validator 2
    let tx: ExecuteResult;
    tx = await appBitcoinClients[1].registerValidator();
    console.log(`Register validator at: ${tx.transactionHash}`);
    tx = await appBitcoinClients[1].setSignatoryKey({
      xpub: encodeXpub({ key: validatorKeys[1][1] })
    });
    console.log(`Setting signatory key at: ${tx.transactionHash}`);
    await moveNextCheckpoint(3, btcClient, relayerServices[0], appBitcoinClients[0], triggerServices[0], walletAddress, walletName);
    while (true) {
      const index = await appBitcoinClients[0].buildingIndex();
      if (index == 4) {
        console.log('Relayed deposit successfully');
        let checkpoint = await appBitcoinClients[0].buildingCheckpoint();
        console.log(checkpoint.sigset.present_vp);
        expect(checkpoint.sigset.present_vp).toBe(1_100_000_000);
        break;
      }
      await btcClient.generatetoaddress({ address: walletAddress, nblocks: 1 }, walletName);
      await wrappedExecuteTransaction(async () => {
        await triggerServices[0].triggerBlocks();
      }, logger('Testing relay deposit'));
      await setTimeout(1000);
    }

    // Update voting power, this will be effected on checkpoint building 2
    await clients[0].sendTokens(clientAddresses[0], userAddress, [coin('120000000', 'orai')], 'auto', '');
    await userClient.delegateTokens(userAddress, convertToOtherAddress(clientAddresses[0]), coin('100000000', 'orai'), 'auto', '');
    await moveNextCheckpoint(4, btcClient, relayerServices[0], appBitcoinClients[0], triggerServices[0], walletAddress, walletName);
    await btcClient.sendtoaddress({
      address: depositAddress,
      amount: '0.5'
    });
    while (true) {
      const index = await appBitcoinClients[0].buildingIndex();
      if (index == 5) {
        console.log('Relayed deposit successfully');
        let checkpoint = await appBitcoinClients[0].buildingCheckpoint();
        expect(checkpoint.sigset.present_vp).toBe(1_200_000_000);
        break;
      }
      await btcClient.generatetoaddress({ address: walletAddress, nblocks: 1 }, walletName);
      await wrappedExecuteTransaction(async () => {
        await triggerServices[0].triggerBlocks();
      }, logger('Testing relay deposit'));
      await setTimeout(1000);
    }
  }, 1000_000_000);
});
