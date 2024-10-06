import { AppBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { Dest as SdkDest } from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import { Logger } from "winston";
import { logger } from "../../configs/logger";
import { TableName } from "../../utils/db";
import { DuckDbNode } from "../db";

export interface WatchedScriptsInterface {
  script: string;
  address: string;
  dest: SdkDest;
  sigsetIndex: number;
  sigsetCreateTime: number;
}

export interface StoredWatchedScriptsInterface {
  script: string;
  address: string;
  dest: string;
  sigsetIndex: number;
  sigsetCreateTime: number;
}

class WatchedScriptsService {
  static instances: WatchedScriptsService;
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
      await this.db.insert(TableName.WatchedScripts, {
        ...data,
        dest: JSON.stringify(data.dest),
      });
      this.logger.info(
        `Inserted new script with address ${data.address}, dest: ${data.dest}`
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
      const checkpointConfig = await this.appBitcoinClient.checkpointConfig();
      const currentTime = Date.now();
      const scripts: WatchedScriptsInterface[] = await this.db.select(
        TableName.WatchedScripts,
        {}
      );
      let count = 0;
      for (const script of scripts) {
        if (script.sigsetCreateTime + checkpointConfig.max_age < currentTime) {
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
