import { AppBitcoinClient } from '@oraichain/bitcoin-bridge-contracts-sdk';
import { RPCClient } from '@oraichain/rpc-bitcoin';
import env from '../configs/env';
import { OraichainConfig } from '../configs/networks';
import TriggerBlocks from '../trigger_block';
import { initSignerClient } from '../utils/cosmos';
import { decryptMnemonic } from '../utils/mnemonic';

const start = async () => {
  let mnemonic = env.cosmos.mnemonic;
  if (!mnemonic) {
    mnemonic = decryptMnemonic('Mnemonic passphrase:', env.cosmos.encryptedMnemonic);
  }

  const btcClient = new RPCClient({
    port: env.bitcoin.port,
    host: env.bitcoin.host,
    user: env.bitcoin.username,
    pass: env.bitcoin.password
  });

  const { prefix, gasPrice } = OraichainConfig;

  const { sender, client } = await initSignerClient(env.cosmos.rpcUrl, mnemonic, prefix, gasPrice);
  const appBitcoinClient = new AppBitcoinClient(client, sender, env.cosmos.appBitcoin);

  const triggerBlock = new TriggerBlocks(appBitcoinClient);

  await triggerBlock.relay();
};

export default async () => {
  await start();
};
