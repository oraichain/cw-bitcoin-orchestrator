import RelayerService from "../../services/relayer";

const getPendingDeposits = async (address: string) => {
  const relayerService = RelayerService.instances;
  return relayerService.getPendingDeposits(address);
};

const getDepositAddress = async (address: string) => {
  const relayerService = RelayerService.instances;
  return relayerService.getDepositAddress(address);
};

export default {
  getPendingDeposits,
  getDepositAddress,
};
