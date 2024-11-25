import { AppBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";

class ContractService {
  constructor(protected appBitcoinQueryClient: AppBitcoinQueryClient) {}

  getConfig = async () => {
    return this.appBitcoinQueryClient.config();
  };
}

export default ContractService;
