import { CwBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import env from "../../configs/env";
import { WasmLocalConfig } from "../../configs/networks";
import { initQueryClient } from "../../utils/cosmos";

const getCheckpoint = async (index: number | undefined) => {
  const client = await initQueryClient(
    env.cosmos.rpcUrl || WasmLocalConfig.rpcEndpoint
  );
  const queryClient = new CwBitcoinQueryClient(client, env.cosmos.cwBitcoin);
  if (index === undefined) {
    return queryClient.buildingCheckpoint();
  }
  return queryClient.checkpointByIndex({ index });
};

export default {
  getCheckpoint,
};
