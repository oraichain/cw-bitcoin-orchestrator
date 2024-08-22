import { CwBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { Dest } from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import env from "../../configs/env";
import RelayerService from "../../services/relayer";
import { initQueryClient } from "../../utils/cosmos";

const getConfig = async () => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new CwBitcoinQueryClient(client, env.cosmos.cwBitcoin);
  return queryClient.bitcoinConfig();
};

const getPendingDeposits = async (address: string) => {
  const relayerService = RelayerService.instances;
  return relayerService.getPendingDeposits(address);
};

const submitDepositAddress = async (
  depositAddr: string,
  sigsetIndex: number,
  dest: Dest
) => {
  const relayerService = RelayerService.instances;
  await relayerService.submitDepositAddress(depositAddr, sigsetIndex, dest);
  return [];
};

const getValueLocked = async () => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new CwBitcoinQueryClient(client, env.cosmos.cwBitcoin);
  try {
    const valueLocked = await queryClient.valueLocked();
    return valueLocked;
  } catch (err) {
    return 0;
  }
};

const getCheckpointQueue = async () => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new CwBitcoinQueryClient(client, env.cosmos.cwBitcoin);
  try {
    const [buildingIndex, confirmedIndex, firstUnconfirmedIndex] =
      await Promise.all([
        queryClient.buildingIndex(),
        queryClient.confirmedIndex(),
        queryClient.unhandledConfirmedIndex(),
      ]);
    return {
      index: buildingIndex,
      first_unhandled_confirmed_cp_index: firstUnconfirmedIndex,
      confirmed_index: confirmedIndex,
    };
  } catch (err) {
    return {
      index: 0,
      first_unhandled_confirmed_cp_index: 0,
      confirmed_index: 0,
    };
  }
};

export default {
  getConfig,
  getPendingDeposits,
  submitDepositAddress,
  getValueLocked,
  getCheckpointQueue,
};
