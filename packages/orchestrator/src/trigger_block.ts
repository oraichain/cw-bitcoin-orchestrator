import { AppBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { setTimeout } from "timers/promises";
import { Logger } from "winston";
import { logger } from "./configs/logger";

// TODO: remove this in the future
class TriggerBlocks {
  logger: Logger;
  constructor(protected appBitcoinClient: AppBitcoinClient) {
    this.logger = logger("TriggerBlocks");
  }

  async triggerBlocks() {
    // create a random hash string
    const hash = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const tx = await this.appBitcoinClient.triggerBeginBlock({
      hash: Buffer.from(hash, "hex").toString("base64"),
    });
    this.logger.info("Update block at:", tx.transactionHash);
  }

  async relay() {
    while (true) {
      try {
        await this.triggerBlocks();
      } catch (err) {
        this.logger.error("[TRIGGER BLOCK] Error:", err);
      }
      await setTimeout(10 * 1000); // 1 minutes per block
    }
  }
}

export default TriggerBlocks;
