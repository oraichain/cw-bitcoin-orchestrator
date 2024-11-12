import { AppBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import {
  fromBinaryTransaction,
  getBitcoinTransactionTxid,
} from "@oraichain/bitcoin-bridge-wasm-sdk";
import env from "../../configs/env";
import { initQueryClient } from "../../utils/cosmos";

const getConfig = async () => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new AppBitcoinQueryClient(client, env.cosmos.appBitcoin);
  return queryClient.checkpointConfig();
};

const getCheckpoint = async (index: number | undefined) => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new AppBitcoinQueryClient(client, env.cosmos.appBitcoin);
  const checkpoint = index
    ? await queryClient.checkpointByIndex({ index })
    : await queryClient.buildingCheckpoint();

  const checkpointTx = await queryClient.checkpointTx({ index });
  let checkpointTransaction = fromBinaryTransaction(
    Buffer.from(checkpointTx, "base64")
  );
  return {
    ...checkpoint,
    transaction: {
      data: checkpointTransaction,
      hash: getBitcoinTransactionTxid(checkpointTransaction),
    },
  };
};

const getDepositFee = async (index: number | undefined) => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new AppBitcoinQueryClient(client, env.cosmos.appBitcoin);
  return queryClient.depositFees({ index });
};

const getWithdrawFee = async (index: number | undefined, address: string) => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new AppBitcoinQueryClient(client, env.cosmos.appBitcoin);
  return queryClient.withdrawalFees({ address, index });
};

const getCheckpointFee = async (index: number | undefined) => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new AppBitcoinQueryClient(client, env.cosmos.appBitcoin);
  return queryClient.checkpointFees({ index });
};

export default {
  getConfig,
  getCheckpoint,
  getDepositFee,
  getWithdrawFee,
  getCheckpointFee,
};
