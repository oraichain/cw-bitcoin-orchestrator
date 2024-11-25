import { AppBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import {
  fromBinaryTransaction,
  getBitcoinTransactionTxid,
} from "@oraichain/bitcoin-bridge-wasm-sdk";

class CheckpointService {
  constructor(protected appBitcoinQueryClient: AppBitcoinQueryClient) {}

  getConfig = async () => {
    return this.appBitcoinQueryClient.checkpointConfig();
  };

  getCheckpoint = async (index: number | undefined) => {
    const checkpoint = index
      ? await this.appBitcoinQueryClient.checkpointByIndex({ index })
      : await this.appBitcoinQueryClient.buildingCheckpoint();

    const checkpointTx = await this.appBitcoinQueryClient.checkpointTx({
      index,
    });
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

  getDepositFee = async (index: number | undefined) => {
    return this.appBitcoinQueryClient.depositFees({ index });
  };

  getWithdrawFee = async (index: number | undefined, address: string) => {
    return this.appBitcoinQueryClient.withdrawalFees({ address, index });
  };

  getCheckpointFee = async (index: number | undefined) => {
    return this.appBitcoinQueryClient.checkpointFees({ index });
  };
}

export default CheckpointService;
