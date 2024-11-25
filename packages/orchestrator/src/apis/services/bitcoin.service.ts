import { AppBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";

class BitcoinService {
  constructor(protected appBitcoinQueryClient: AppBitcoinQueryClient) {}

  getConfig = async () => {
    return this.appBitcoinQueryClient.bitcoinConfig();
  };

  getValueLocked = async () => {
    try {
      const valueLocked = await this.appBitcoinQueryClient.valueLocked();
      return valueLocked;
    } catch (err) {
      return 0;
    }
  };

  getCheckpointQueue = async () => {
    try {
      const buildingIndex = await this.appBitcoinQueryClient.buildingIndex();
      const confirmedIndex = await this.appBitcoinQueryClient.confirmedIndex();
      const firstUnconfirmedIndex =
        await this.appBitcoinQueryClient.unhandledConfirmedIndex();

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
}

export default BitcoinService;
