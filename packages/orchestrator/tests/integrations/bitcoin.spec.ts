import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { coin, GasPrice } from "@cosmjs/stargate";
import { AppBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { LightClientBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk/build/LightClientBitcoin.client";
import {
  encodeXpub,
  toBinaryBlockHeader,
} from "@oraichain/bitcoin-bridge-wasm-sdk";
import BIP32Factory from "bip32";
import * as btc from "bitcoinjs-lib";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { RPCClient } from "rpc-bitcoin";
import { setTimeout } from "timers/promises";
import * as ecc from "tiny-secp256k1";
import { BitcoinBlock } from "../../src/@types";
import { DuckDbNode } from "../../src/services/db";
import RelayerService from "../../src/services/relayer";
import SignerService from "../../src/services/signer";
import TriggerBlocks from "../../src/trigger_block";
import { initSignerClient } from "../../src/utils/cosmos";
import { initBitcoinContract, initOsorContract } from "./_init";

describe("Test bitcoin integration", () => {
  let mnemonics = [
    "rough minor raise pelican rate dog camera fold scissors asthma tuition gaze silver mom borrow bicycle produce witness forest blush law arctic name issue",
    "ski office crowd wine fabric digital cricket toward ripple tattoo live amount",
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
  let bitcoindProcess: any;
  let entryPointAddress: string;
  let lightClientBitcoinAddress: string;
  let appBitcoinAddress: string;
  let tokenFactoryAddress: string;
  let walletName: string;
  let walletAddress: string;

  beforeAll(async () => {
    fs.rmSync(path.join(__dirname, "testdata/data/regtest"), {
      recursive: true,
      force: true,
    });

    await DuckDbNode.create();
    await DuckDbNode.instances.createTable();
    btcClient = new RPCClient({
      port: 18443,
      host: "http://127.0.0.1",
      user: "satoshi",
      pass: "nakamoto",
    });

    const { sender, client } = await initSignerClient(
      "http://127.0.0.1:26657",
      mnemonics[0],
      "orai",
      GasPrice.fromString("0.002orai")
    );
    const { entryPointAddress: epAddress } = await initOsorContract(
      client,
      sender
    );
    entryPointAddress = epAddress;
    const {
      lightClientBitcoinAddress: lcAddress,
      appBitcoinAddress: aAddress,
      tokenFactoryAddress: tfAddress,
    } = await initBitcoinContract(client, sender, entryPointAddress);
    lightClientBitcoinAddress = lcAddress;
    appBitcoinAddress = aAddress;
    tokenFactoryAddress = tfAddress;

    const bip32 = BIP32Factory(ecc);
    for (let i = 0; i < 1; i++) {
      const { sender, client } = await initSignerClient(
        "http://127.0.0.1:26657",
        mnemonics[i],
        "orai",
        GasPrice.fromString("0.002orai")
      );
      const seed = crypto.randomBytes(32);
      const node = bip32.fromSeed(seed, btc.networks.bitcoin);
      const xpriv = node.toBase58();
      const xpub = node.neutered().toBase58();
      validatorKeys.push([xpriv, xpub]);

      lightClientBitcoinClients.push(
        new LightClientBitcoinClient(client, sender, lightClientBitcoinAddress)
      );
      appBitcoinClients.push(
        new AppBitcoinClient(client, sender, appBitcoinAddress)
      );
      signerServices.push(
        new SignerService(
          btcClient,
          lightClientBitcoinClients[i],
          appBitcoinClients[i]
        )
      );
      relayerServices.push(
        new RelayerService(
          btcClient,
          lightClientBitcoinClients[i],
          appBitcoinClients[i],
          DuckDbNode.instances
        )
      );
      triggerServices.push(new TriggerBlocks(appBitcoinClients[i]));
      clients.push(client);
      clientAddresses.push(sender);

      if (i == 0) {
        RelayerService.instances = relayerServices[i];

        // fix to create or get wallet
        walletName = (
          await btcClient.createwallet({
            wallet_name: "bridger",
            avoid_reuse: true,
          })
        ).name;
        walletAddress = await btcClient.getnewaddress({}, walletName);

        // update trusted height
        for (let i = 0; i < 5; i++) {
          await btcClient.generatetoaddress(
            { address: walletAddress, nblocks: 200 },
            walletName
          );
        }

        let blockHash = await btcClient.getbestblockhash();
        let blockInfo: BitcoinBlock = await btcClient.getblock({
          blockhash: blockHash,
          verbosity: 2,
        });

        let tx = await lightClientBitcoinClients[i].updateHeaderConfig({
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
                nonce: blockInfo.nonce,
              })
            ).toString("base64"),
          },
        });
        console.log(`Updated header at ${tx.transactionHash}`);

        tx = await appBitcoinClients[i].registerDenom(
          {
            subdenom: "obtc",
          },
          "auto",
          "",
          [coin("10000000", "orai")]
        );
        console.log("Register denom at:", tx.transactionHash);

        tx = await appBitcoinClients[0].registerValidator();
        console.log(`Register validator at: ${tx.transactionHash}`);

        tx = await appBitcoinClients[0].setSignatoryKey({
          xpub: encodeXpub({ key: xpub }),
        });
        console.log(`Setting signatory key at: ${tx.transactionHash}`);
      }
    }
  }, 60000);

  it("Testing relay header", async () => {
    relayerServices[0].relayHeader();
    await btcClient.generatetoaddress(
      { address: walletAddress, nblocks: 200 },
      walletName
    );
    while (true) {
      const height = await lightClientBitcoinClients[0].headerHeight();
      console.log(height);
      if (height == 1200) {
        console.log("Relayed headers successfully");
        break;
      }
      await setTimeout(100);
    }
  }, 60000);

  it("Testing full app", async () => {
    await triggerServices[0].triggerBlocks();
    Promise.all([
      triggerServices[0].relay(),
      relayerServices[0].relay(),
      signerServices[0].relay(),
    ]);
    let depositAddress = await relayerServices[0].generateDepositAddress(
      0,
      {
        address: "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd",
      },
      btc.networks.regtest
    );
    await relayerServices[0].submitDepositAddress(
      depositAddress,
      0,
      {
        address: "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd",
      },
      "regtest"
    );
    console.log(await btcClient.getbalance({}));
    btcClient.sendtoaddress({
      address: depositAddress,
      amount: "1",
    });
    while (true) {
      let balance = await clients[0].getBalance(
        clientAddresses[0],
        `factory/${tokenFactoryAddress}/obtc`
      );
      if (BigInt(balance.amount) != 0n) {
        break;
      }
      await btcClient.generatetoaddress(
        { address: walletAddress, nblocks: 1 },
        walletName
      );
    }

    return;
  }, 60000);
});
