import { CwBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import env from "../../configs/env";
import { initQueryClient } from "../../utils/cosmos";

const getConfig = async () => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new CwBitcoinQueryClient(client, env.cosmos.cwBitcoin);
  return queryClient.checkpointConfig();
};

const getCheckpoint = async (index: number | undefined) => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new CwBitcoinQueryClient(client, env.cosmos.cwBitcoin);
  if (index === undefined) {
    return queryClient.buildingCheckpoint();
  }
  return queryClient.checkpointByIndex({ index });
};

const getDepositFee = async (index: number | undefined) => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new CwBitcoinQueryClient(client, env.cosmos.cwBitcoin);
  return queryClient.depositFees({ index });
};

const getWithdrawFee = async (index: number | undefined, address: string) => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new CwBitcoinQueryClient(client, env.cosmos.cwBitcoin);
  return queryClient.withdrawalFees({ address, index });
};

const getCheckpointFee = async (index: number | undefined) => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new CwBitcoinQueryClient(client, env.cosmos.cwBitcoin);
  return queryClient.checkpointFees({ index });
};

const getStoreCheckpointIndexes = async () => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new CwBitcoinQueryClient(client, env.cosmos.cwBitcoin);
  const [completedIndex, confirmedIndex, firstUnconfirmedIndex] =
    await Promise.all([
      queryClient.completedIndex(),
      queryClient.confirmedIndex(),
      queryClient.unhandledConfirmedIndex(),
    ]);
  return {
    completedIndex,
    confirmedIndex,
    firstUnconfirmedIndex,
  };
};

export default {
  getConfig,
  getCheckpoint,
  getDepositFee,
  getWithdrawFee,
  getCheckpointFee,
  getStoreCheckpointIndexes,
};
