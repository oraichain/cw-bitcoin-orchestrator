import {
  AppBitcoinClient,
  LightClientBitcoinClient,
} from "@oraichain/bitcoin-bridge-contracts-sdk";
import { RPCClient } from "@oraichain/rpc-bitcoin";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import http from "http";
import httpStatus from "http-status";
import os from "os";
import path from "path";
import xss from "xss-clean";
import bitcoinRoute from "../apis/routes/bitcoin.route";
import checkpointRoute from "../apis/routes/checkpoint.route";
import contractRoute from "../apis/routes/contract.route";
import env from "../configs/env";
import morgan from "../configs/morgan";
import { OraichainConfig } from "../configs/networks";
import { DuckDbNode } from "../services/db";
import RelayerService from "../services/relayer";
import { initSignerClient } from "../utils/cosmos";
import { decryptMnemonic } from "../utils/mnemonic";

const startServer = (
  relayer: RelayerService,
  appBitcoinClient: AppBitcoinClient
) =>
  new Promise((resolve) => {
    const app = express();
    const server = http.createServer(app);
    // SET UP DEFAULTS APPS
    app.use(morgan.successHandler);
    app.use(morgan.errorHandler);
    app.use(helmet());
    app.use(
      cors({
        origin: "*",
      })
    );
    app.use(express.json());
    app.use(xss());
    app.use(compression());
    app.use(cookieParser());
    app.use((err: any, req: any, res: any, next: any) => {
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

    app.use("/api/bitcoin", bitcoinRoute(relayer, appBitcoinClient));
    app.use("/api/checkpoint", checkpointRoute(appBitcoinClient));
    app.use("/api/contract", contractRoute(appBitcoinClient));
    app.get("/node_info", (_, res) => {
      res.status(httpStatus.OK).json({
        message: "Ok",
        data: [],
      });
    });

    server.listen(PORT, () => {
      const homeDir = os.homedir();
      const relayerDirPath = path.join(homeDir, env.server.storageDirName);

      console.log("[ACTIVE] Server is running on port " + PORT);
      console.log("Orchestrator is storing data at " + relayerDirPath);
      resolve(true);
    });
  });

const createService = async (): Promise<{
  relayerService: RelayerService;
  appBitcoinClient: AppBitcoinClient;
  lightClientBitcoinClient: LightClientBitcoinClient;
}> => {
  console.log("Initilizing DuckDB...");
  await DuckDbNode.create(env.duckdb.name);
  console.log("Initilized DuckDB!");
  console.log("Creating tables in DuckDB!");
  await DuckDbNode.instances.createTable();
  console.log("Tables are created in DuckDB!");

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
    timeout: 60000,
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
  const relayerService = new RelayerService(
    btcClient,
    lightClientBitcoinClient,
    appBitcoinClient,
    DuckDbNode.instances
  );

  return {
    relayerService,
    appBitcoinClient,
    lightClientBitcoinClient,
  };
};

export default async () => {
  const { relayerService, appBitcoinClient } = await createService();

  if (process.env.API_ENABLED === "true") {
    await startServer(relayerService, appBitcoinClient);
  }

  await relayerService.relay();
};
