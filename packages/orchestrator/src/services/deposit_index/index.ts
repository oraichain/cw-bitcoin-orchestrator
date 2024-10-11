import { Deposit, DepositInfo } from "@oraichain/bitcoin-bridge-wasm-sdk";
import { Logger } from "winston";
import { logger } from "../../configs/logger";
import { TableName } from "../../utils/db";
import { DuckDbNode } from "../db";

export interface DepositIndexInterface {
  receiver: string;
  bitcoinAddress: string;
  txid: string;
  vout: number;
  deposit: string;
}
export interface GetParams extends Omit<DepositIndexInterface, "deposit"> {}
export interface DeleteParams extends Omit<DepositIndexInterface, "deposit"> {}

class DepositIndexService {
  static instances: DepositIndexService;
  logger: Logger;
  constructor(protected db: DuckDbNode) {
    this.db = db;
    this.logger = logger("DepositIndexService");
  }

  async insertDeposit(data: DepositIndexInterface) {
    const deposit = await this.get({ ...data });
    if (!deposit) {
      await this.db.insert(TableName.DepositIndex, {
        ...data,
      });
    }
    this.logger.info(
      `Insert deposit, with receiver ${data.receiver}, bitcoin address ${data.bitcoinAddress}, txid: ${data.txid}, vout: ${data.vout}, deposit: ${data.deposit}`
    );
  }

  async removeDeposit({ receiver, bitcoinAddress, txid, vout }: DeleteParams) {
    await this.db.delete(TableName.DepositIndex, {
      where: { receiver, bitcoinAddress, txid, vout },
    });
    this.logger.info(
      `Remove deposit with receiver ${receiver}, bitcoin address ${bitcoinAddress}, txid: ${txid}, vout: ${vout}`
    );
  }

  async getDepositsByReceiver(
    receiver: string,
    currentBtcHeight: number
  ): Promise<DepositInfo[]> {
    let depositsInfo = [];
    const deposits = (await this.db.select(TableName.DepositIndex, {
      where: { receiver },
    })) as DepositIndexInterface[];
    for (const depositItem of deposits) {
      let depositEncoded = depositItem.deposit;
      let deposit = JSON.parse(depositEncoded) as Deposit;
      depositsInfo = [
        ...depositsInfo,
        {
          deposit,
          confirmations: deposit.height
            ? currentBtcHeight - deposit.height + 1
            : 0,
        },
      ];
    }
    return depositsInfo;
  }

  async get({
    receiver,
    bitcoinAddress,
    txid,
    vout,
  }: GetParams): Promise<Deposit> {
    const data = (await this.db.select(TableName.DepositIndex, {
      where: { receiver, bitcoinAddress, txid, vout },
    })) as DepositIndexInterface[];
    if (data.length === 0) {
      return null;
    }
    let depositEncoded = data[0].deposit;
    return JSON.parse(depositEncoded);
  }
}

export default DepositIndexService;
