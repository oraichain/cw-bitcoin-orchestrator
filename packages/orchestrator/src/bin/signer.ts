import {
  AppBitcoinClient,
  LightClientBitcoinClient,
} from "@oraichain/bitcoin-bridge-contracts-sdk";
import { RPCClient } from "rpc-bitcoin";
import env from "../configs/env";
import { OraichainConfig } from "../configs/networks";
import SignerService from "../services/signer";
import { initSignerClient } from "../utils/cosmos";
import { decryptMnemonic } from "../utils/mnemonic";

const start = async () => {
  let mnemonic = env.cosmos.mnemonic;
  if (!mnemonic) {
    mnemonic = decryptMnemonic(
      "Mnemonic passphrase:",
      env.cosmos.encryptedMnemonic
    );
  }

  const btcClient = new RPCClient({
    port: env.bitcoin.port,
    host: env.bitcoin.host,
    user: env.bitcoin.username,
    pass: env.bitcoin.password,
  });

  const { prefix, gasPrice } = OraichainConfig;

  const { sender, client } = await initSignerClient(
    env.cosmos.rpcUrl,
    mnemonic,
    prefix,
    gasPrice
  );
  const lightClientBitcoinClient = new LightClientBitcoinClient(
    client,
    sender,
    env.cosmos.lightClientBitcoin
  );
  const appBitcoinClient = new AppBitcoinClient(
    client,
    sender,
    env.cosmos.appBitcoin
  );

  const signerService = new SignerService(
    btcClient,
    lightClientBitcoinClient,
    appBitcoinClient
  );

  await Promise.all([signerService.relay()]);
};

export default async () => {
  await start();
};
