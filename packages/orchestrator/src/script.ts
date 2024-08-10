import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { toBinaryBlockHeader } from "@oraichain/bitcoin-bridge-wasm-sdk";
import env from "./configs/env";
import { WasmLocalConfig } from "./configs/networks";
import { initSignerClient } from "./utils/cosmos";

// Set up testnet for testing
const main = async () => {
  const { sender, client } = await initSignerClient(WasmLocalConfig);
  const cwBitcoinClient = new CwBitcoinClient(
    client,
    sender,
    env.cosmos.cwBitcoin
  );

  const tx = await cwBitcoinClient.updateHeaderConfig({
    config: {
      max_length: 24192,
      max_time_increase: 2 * 60 * 60,
      trusted_height: 2574432,
      retarget_interval: 2016,
      target_spacing: 10 * 60,
      target_timespan: 2016 * (10 * 60),
      max_target: 0x1d00ffff,
      retargeting: true,
      min_difficulty_blocks: true,
      trusted_header: toBinaryBlockHeader({
        version: 536870912,
        prev_blockhash:
          "000000000000001f6d8dc4976552a596eff2eb0df15b0d9ee61a55091a2050c2",
        merkle_root:
          "03a2f5712c4c44daafa6475007de611b91be9738fc005788b7072153d651f36f",
        time: 1705736135,
        bits: 422015362,
        nonce: 3433041756,
      }),
    },
  });
  console.log(tx.transactionHash);
};

main();
