import {
  CosmWasmClient,
  SigningCosmWasmClient,
} from "@cosmjs/cosmwasm-stargate";
import { fromBech32, toBech32 } from "@cosmjs/encoding";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { Logger } from "winston";

export const wrappedExecuteTransaction = async (
  fn: () => Promise<void>,
  logger: Logger
) => {
  while (true) {
    try {
      await fn();
      break;
    } catch (error) {
      let message = error?.message;
      if (message?.includes("account sequence mismatch")) {
        continue;
      } else {
        logger.error(`[UNEXPECTED ERROR] Error:`, error);
        break;
      }
    }
  }
};

export const initQueryClient = async (rpcUrl: string) => {
  const client = await CosmWasmClient.connect(rpcUrl);
  return client;
};

export const initSignerClient = async (
  rpcUrl: string,
  mnemonic: string,
  prefix: string,
  gasPrice: GasPrice
) => {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix,
  });
  const [firstAccount] = await wallet.getAccounts();
  const client = await SigningCosmWasmClient.connectWithSigner(rpcUrl, wallet, {
    gasPrice,
    broadcastPollIntervalMs: 500,
  });

  return {
    sender: firstAccount.address,
    client,
  };
};

export const convertToOtherAddress = (
  address: string,
  prefix: string = "oraivaloper"
) => {
  const bech32Data = fromBech32(address);
  return toBech32(prefix, bech32Data.data);
};
