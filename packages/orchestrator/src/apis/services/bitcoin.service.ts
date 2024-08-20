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

export default {
  getConfig,
  getPendingDeposits,
  submitDepositAddress,
};
