import {
  AppBitcoinClient,
  LightClientBitcoinClient,
} from "@oraichain/bitcoin-bridge-contracts-sdk";
import { RPCClient } from "rpc-bitcoin";
import bitcoinService from "../apis/services/bitcoin.service";
import env from "../configs/env";
import { OraichainConfig } from "../configs/networks";
import { DuckDbNode } from "../services/db";
import RelayerService from "../services/relayer";
import { initSignerClient } from "../utils/cosmos";
import { decryptMnemonic } from "../utils/mnemonic";

const main = async (
  oraiAddress: string,
  depositAddress: string,
  sigsetIndex: number
) => {
  console.log("Initilizing DuckDB...");
  await DuckDbNode.create(env.duckdb.name);
  console.log("Initilized DuckDB!");
  console.log("Creating tables in DuckDB!");
  await DuckDbNode.instances.createTable();
  let mnemonic = env.cosmos.mnemonic;
  if (!mnemonic) {
    mnemonic = decryptMnemonic(
      "Mnemonic passphrase:",
      env.cosmos.encryptedMnemonic
    );
  }
  const { prefix, gasPrice } = OraichainConfig;
  const { sender, client } = await initSignerClient(
    env.cosmos.rpcUrl,
    mnemonic,
    prefix,
    gasPrice
  );
  const btcClient = new RPCClient({
    port: env.bitcoin.port,
    host: env.bitcoin.host,
    user: env.bitcoin.username,
    pass: env.bitcoin.password,
  });
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
  const relayerService = new RelayerService(
    btcClient,
    lightClientBitcoinClient,
    appBitcoinClient,
    DuckDbNode.instances
  );
  RelayerService.instances = relayerService;
  await bitcoinService.submitDepositAddress(depositAddress, sigsetIndex, {
    address: oraiAddress,
  });
  console.log("Added deposit address successfully!");
};

export default main;
