import { AppBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import {
  BufferCollection,
  compare,
  DownloadState,
  SimulateCosmWasmClient,
  SortedMap,
} from "@oraichain/cw-simulate";
import fs, { readFileSync } from "fs";
import os from "os";
import path from "path";
import { setTimeout } from "timers/promises";
import env from "../../configs/env";
import { logger } from "../../configs/logger";
import { ITERATION_DELAY } from "../../constants";
import CwAppBitcoinCode from "./wasm/cw-app-bitcoin";

class ContractSimulator {
  static simulateAppCwBitcoin: AppBitcoinClient;
  static simulateClient: SimulateCosmWasmClient = new SimulateCosmWasmClient({
    chainId: "Oraichain",
    bech32Prefix: "orai",
  });
  static finalState = new DownloadState(
    env.cosmos.lcdUrl,
    path.join(os.homedir(), `${env.server.storageDirName}/data/final`)
  );
  static pendingState = new DownloadState(
    env.cosmos.lcdUrl,
    path.join(os.homedir(), `${env.server.storageDirName}/data/pending`)
  );
  static logger = logger("ContractSimulator");
  static initialized: boolean = false;
  static sender: string = "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd";

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

    // load new state
    await Promise.all([
      this.finalState.loadState(
        this.simulateClient,
        this.sender,
        env.cosmos.appBitcoin,
        "cw-app-bitcoin"
      ),
    ]);
    this.simulateAppCwBitcoin = new AppBitcoinClient(
      this.simulateClient as any,
      this.sender,
      env.cosmos.appBitcoin
    );

    this.initialized = true;

    await Promise.all([this.loadStateAndCode(env.cosmos.appBitcoin)]);
    this.logger.info("Finish state crawler!");
  };

  static async tryInitializeWithOldData() {
    try {
      await Promise.all([this.loadStateAndCode(env.cosmos.appBitcoin)]);
      this.simulateAppCwBitcoin = new AppBitcoinClient(
        this.simulateClient as any,
        this.sender,
        env.cosmos.appBitcoin
      );
      this.initialized = true;
    } catch (err) {
      this.logger.info(`[tryInitializeWithOldData] ${err}`);
    }
  }

  static async loadStateAndCode(contractAddress: string) {
    const code = Buffer.from(CwAppBitcoinCode.code, "base64");
    const state = readFileSync(
      path.join(
        os.homedir(),
        `${env.server.storageDirName}/data/final/${contractAddress}.state`
      )
    );
    const { codeId } = await this.simulateClient.upload(
      this.sender,
      code,
      "auto"
    );
    const raw = SortedMap.rawPack(
      new BufferCollection(state as any) as any,
      compare
    );
    await this.simulateClient.loadContract(
      env.cosmos.appBitcoin,
      {
        codeId: codeId,
        admin: this.sender,
        created: new Date().getTime(),
        creator: "",
        label: "",
      },
      raw
    );
  }

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
    this.tryInitializeWithOldData();
    while (true) {
      await this.stateCrawler();
      await setTimeout(ITERATION_DELAY.SIMULATOR_INTERVAL);
    }
  }
}

export default ContractSimulator;
