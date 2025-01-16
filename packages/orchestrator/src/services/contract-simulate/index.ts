import { AppBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { DownloadState, SimulateCosmWasmClient } from "@oraichain/cw-simulate";
import fs from "fs";
import os from "os";
import path from "path";
import { setTimeout } from "timers/promises";
import env from "../../configs/env";
import { logger } from "../../configs/logger";
import { ITERATION_DELAY } from "../../constants";

class ContractSimulator {
  static finalState = new DownloadState(
    env.cosmos.rpcUrl,
    path.join(os.homedir(), `${env.server.storageDirName}/data/final`)
  );
  static pendingState = new DownloadState(
    env.cosmos.rpcUrl,
    path.join(os.homedir(), `${env.server.storageDirName}/data/pending`)
  );
  static logger = logger("ContractSimulator");
  static initialized: boolean = false;
  static sender: string = "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd";

  static async simulateAppCwBitcoin(): Promise<AppBitcoinClient> {
    const simulateClient: SimulateCosmWasmClient = new SimulateCosmWasmClient({
      chainId: "Oraichain",
      bech32Prefix: "orai",
    });
    await Promise.all([
      this.finalState.loadState(
        simulateClient,
        this.sender,
        env.cosmos.appBitcoin,
        "cw-app-bitcoin"
      ),
    ]);
    this.initialized = true;
    return new AppBitcoinClient(
      simulateClient as any,
      this.sender,
      env.cosmos.appBitcoin
    );
  }

  static stateCrawler = async () => {
    this.logger.info("Starting download new state");
    const source = path.join(
      os.homedir(),
      `${env.server.storageDirName}/data/pending`
    );
    const dest = path.join(
      os.homedir(),
      `${env.server.storageDirName}/data/final`
    );

    if (!fs.existsSync(source)) {
      fs.mkdirSync(source, { recursive: true });
    }

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    // download and copy to final state
    await Promise.all([this.pendingState.saveState(env.cosmos.appBitcoin)]);
    this.copyFolderContents(source, dest);
    this.logger.info("Success update new state!");
    this.initialized = true;
    this.logger.info("Finish state crawler!");
  };

  static copyFolderContents = (source: string, destination: string) => {
    const files = fs.readdirSync(source);

    files.forEach((file) => {
      const currentFilePath = path.join(source, file);
      const destinationFilePath = path.join(destination, file);

      if (fs.lstatSync(currentFilePath).isDirectory()) {
        this.copyFolderContents(currentFilePath, destinationFilePath);
      } else {
        fs.copyFileSync(currentFilePath, destinationFilePath);
      }
    });
  };

  static setSender(sender: string) {
    this.sender = sender;
  }

  static async sync() {
    while (true) {
      await this.stateCrawler();
      await setTimeout(ITERATION_DELAY.SIMULATOR_INTERVAL);
    }
  }
}

export default ContractSimulator;
