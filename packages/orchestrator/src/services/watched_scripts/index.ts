import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { TableName } from "../../utils/db";
import { DuckDbNode } from "../db";

export interface WatchedScriptsInterface {
  address: string;
  dest: string;
  sigsetIndex: number;
  sigsetCreateTime: number;
}

class WatchedScriptsService {
  constructor(
    protected db: DuckDbNode,
    protected cwBitcoinClient: CwBitcoinClient
  ) {
    this.db = db;
    this.cwBitcoinClient = cwBitcoinClient;
  }

  async insertAddress(data: WatchedScriptsInterface) {
    const address = await this.getAddress(data.address);
    if (!address) {
      await this.db.insert(TableName.WatchedScripts, data);
    }
  }

  async getAddress(address: string): Promise<WatchedScriptsInterface> {
    const data = await this.db.select(TableName.WatchedScripts, {
      where: { address: address },
    });
    return data.length > 0 ? data[0] : undefined;
  }

  async removeExpiredAddresses() {
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
