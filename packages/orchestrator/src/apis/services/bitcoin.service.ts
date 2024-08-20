import { Dest } from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import RelayerService from "../../services/relayer";

const getPendingDeposits = async (address: string) => {
  const relayerService = RelayerService.instances;
  return relayerService.getPendingDeposits(address);
};

const getDepositAddress = async (address: string) => {
  const relayerService = RelayerService.instances;
  return relayerService.generateDepositAddress({ address });
};

const generateDepositAddress = async (dest: Dest) => {
  const relayerService = RelayerService.instances;
  return relayerService.generateDepositAddress(dest);
};

export default {
  getPendingDeposits,
  getDepositAddress,
  generateDepositAddress,
};
