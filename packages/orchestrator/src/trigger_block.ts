import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { setTimeout } from "timers/promises";

// TODO: remove this in the future
class TriggerBlocks {
  constructor(protected cwBitcoinClient: CwBitcoinClient) {}

  async triggerBlocks() {
    // create a random hash string
    const hash = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    await this.cwBitcoinClient.triggerBeginBlock({
      hash: hash,
    });
  }

  async relay() {
    while (true) {
      await this.triggerBlocks();
      console.log("[TEMP] Triggered new block...");
      await setTimeout(1000);
    }
  }
}

export default TriggerBlocks;
