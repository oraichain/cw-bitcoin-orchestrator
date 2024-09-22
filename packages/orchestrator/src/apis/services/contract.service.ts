import { AppBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import env from "../../configs/env";
import { initQueryClient } from "../../utils/cosmos";

const getConfig = async () => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new AppBitcoinQueryClient(client, env.cosmos.appBitcoin);
  return queryClient.config();
};

export default { getConfig };
