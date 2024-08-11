import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import http from "http";
import { RPCClient } from "rpc-bitcoin";
import xss from "xss-clean";
import bitcoinRoute from "./apis/routes/bitcoin.route";
import env from "./configs/env";
import morgan from "./configs/morgan";
import { WasmLocalConfig } from "./configs/networks";
import { DuckDbNode } from "./services/db";
import RelayerService from "./services/relayer";
import TriggerBlocks from "./trigger_block";
import { initSignerClient } from "./utils/cosmos";

const app = express();
const server = http.createServer(app);
// SET UP DEFAULTS APPS
app.use(morgan.successHandler);
app.use(morgan.errorHandler);
app.use(helmet());
app.use(
  cors({
    origin: "*",
    credentials: true,
    exposedHeaders: ["set-cookie"],
  })
);
app.use(express.json());
app.use(xss());
app.use(compression());
app.use(cookieParser());
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Something went wrong";
  return res.status(status).json({
    status,
    message,
    success: false,
    stack: env.server.env == "development" ? err.stack : null,
  });
});

const PORT = env.server.port;

app.use("/api/bitcoin", bitcoinRoute);

server.listen(PORT, async () => {
  console.log("[ACTIVE] Server is running on port " + PORT);
  console.log("Initilizing DuckDB...");
  await DuckDbNode.create(env.duckdb.name);
  console.log("Initilized DuckDB!");
  console.log("Creating tables in DuckDB!");
  await DuckDbNode.instances.createTable();
  console.log("Tables are created in DuckDB!");

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

  const triggerBlock = new TriggerBlocks(cwBitcoinClient);

  const relayerService = new RelayerService(
    btcClient,
    cwBitcoinClient,
    DuckDbNode.instances
  );
  RelayerService.instances = relayerService;
  await Promise.all([
    relayerService.relayHeader(),
    relayerService.relayDeposit(),
    triggerBlock.relay(),
  ]);
});
