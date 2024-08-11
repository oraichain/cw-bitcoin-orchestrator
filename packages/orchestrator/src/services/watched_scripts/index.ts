import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { Dest as SdkDest } from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
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
  constructor(
    protected db: DuckDbNode,
    protected cwBitcoinClient: CwBitcoinClient
  ) {
    this.db = db;
    this.cwBitcoinClient = cwBitcoinClient;
  }

  async insertScript(data: WatchedScriptsInterface) {
    const script = await this.getScript(data.script);
    if (!script) {
      await this.db.insert(TableName.WatchedScripts, {
        ...data,
        dest: JSON.stringify(data.dest),
      });
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

  async removeExpired() {
    // TODO: Implement this by a single sql
    const checkpointConfig = await this.cwBitcoinClient.checkpointConfig();
    const currentTime = Date.now();
    const scripts: WatchedScriptsInterface[] = await this.db.select(
      TableName.WatchedScripts,
      {}
    );
    for (const script of scripts) {
      if (script.sigsetCreateTime + checkpointConfig.max_age < currentTime) {
        await this.db.delete(TableName.WatchedScripts, {
          where: { address: script.address },
        });
      }
    }
  }
}

export default WatchedScriptsService;
