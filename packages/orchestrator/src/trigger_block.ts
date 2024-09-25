import { AppBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { setTimeout } from "timers/promises";

// TODO: remove this in the future
class TriggerBlocks {
  constructor(protected appBitcoinClient: AppBitcoinClient) {}

  async triggerBlocks() {
    // create a random hash string
    const hash = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const tx = await this.appBitcoinClient.triggerBeginBlock({
      hash: Buffer.from(hash, "hex").toString("base64"),
    });
    console.log("Update block at:", tx.transactionHash);
  }

  async relay() {
    while (true) {
      try {
        await this.triggerBlocks();
      } catch (err) {
        console.log(err?.message);
      }
      await setTimeout(10 * 1000); // 1 minutes per block
    }
  }
}

export default TriggerBlocks;
