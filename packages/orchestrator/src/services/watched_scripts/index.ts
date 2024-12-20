import { AppBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { Dest as SdkDest } from "@oraichain/bitcoin-bridge-contracts-sdk/build/AppBitcoin.types";
import { Logger } from "winston";
import { logger } from "../../configs/logger";
import { TableName } from "../../utils/db";
import { DuckDbNode } from "../db";

export interface WatchedScriptsInterface {
  script: string;
  address: string;
  dest: SdkDest;
  sigsetIndex: bigint;
  sigsetCreateTime: bigint;
}

export interface StoredWatchedScriptsInterface {
  script: string;
  address: string;
  dest: string;
  sigsetIndex: bigint;
  sigsetCreateTime: bigint;
}

class WatchedScriptsService {
  logger: Logger;
  constructor(
    protected db: DuckDbNode,
    protected appBitcoinClient: AppBitcoinClient
  ) {
    this.db = db;
    this.appBitcoinClient = appBitcoinClient;
    this.logger = logger("WatchedScriptsService");
  }

  async insertScript(data: WatchedScriptsInterface) {
    const script = await this.getScript(data.script);
    if (!script) {
      let insertedData = {
        ...data,
        dest: JSON.stringify(data.dest),
        sigsetIndex: parseInt(data.sigsetIndex.toString()),
        sigsetCreateTime: parseInt(data.sigsetCreateTime.toString()),
      };
      await this.db.insert(TableName.WatchedScripts, {
        ...insertedData,
      });
      this.logger.info(
        `Inserted new script with address ${
          data.address
        }, data: ${JSON.stringify(insertedData)}`
      );
    }
  }

  async getScript(script: string): Promise<WatchedScriptsInterface | null> {
    const data = await this.db.select(TableName.WatchedScripts, {
      where: { script: script },
    });
    if (data.length === 0) {
      return null;
    }
    let scriptData = data[0] as StoredWatchedScriptsInterface;
    return { ...scriptData, dest: JSON.parse(scriptData.dest) };
  }

  async getAllScripts(): Promise<WatchedScriptsInterface[]> {
    const data = await this.db.select(TableName.WatchedScripts, {});
    return data.map((script) => {
      return { ...script, dest: JSON.parse(script.dest) };
    });
  }

  async removeExpired() {
    // TODO: Implement this by a single sql
    try {
      this.logger.info("Start removing expired scripts");
      const checkpointConfig = await this.appBitcoinClient.checkpointConfig();
      const currentTime = Math.floor(Date.now() / 1000);
      const scripts: WatchedScriptsInterface[] = await this.db.select(
        TableName.WatchedScripts,
        {}
      );
      let count = 0;
      for (const script of scripts) {
        if (
          script.sigsetCreateTime !== null &&
          BigInt(script.sigsetCreateTime) + BigInt(checkpointConfig.max_age) <
            BigInt(currentTime)
        ) {
          await this.db.delete(TableName.WatchedScripts, {
            where: { address: script.address },
          });
          count++;
        }
      }
      this.logger.info(`Removed ${count} expired scripts`);
    } catch (err) {
      this.logger.error(`[WATCHED_SCRIPT] Error:`, err);
    }
  }
}

export default WatchedScriptsService;
