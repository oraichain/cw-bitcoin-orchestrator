import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { RPCClient } from "rpc-bitcoin";
import env from "./configs/env";
import { WasmLocalConfig } from "./configs/networks";
import { DuckDbNode } from "./services/db";
import RelayerService from "./services/relayer";
import { initSignerClient } from "./utils/cosmos";

const main = async () => {
  console.log("Initilizing DuckDB...");
  await DuckDbNode.create(env.duckdb.name);
  console.log("Initilized DuckDB!");

  const btcClient = new RPCClient({
    port: env.bitcoin.port,
    host: env.bitcoin.host,
    user: env.bitcoin.username,
    pass: env.bitcoin.password,
  });

  const { sender, client } = await initSignerClient(WasmLocalConfig);
  const cwBitcoinClient = new CwBitcoinClient(
    client,
    sender,
    env.cosmos.cwBitcoin
  );

  const relayerService = new RelayerService(
    btcClient,
    cwBitcoinClient,
    DuckDbNode.instances
  );
  await relayerService.relayHeader();
};

main();
