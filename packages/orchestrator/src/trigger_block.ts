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
      hash: Buffer.from(hash, "hex").toString("base64"),
    });
  }

  async relay() {
    while (true) {
      await this.triggerBlocks();
      await setTimeout(1000);
    }
  }
}

export default TriggerBlocks;
