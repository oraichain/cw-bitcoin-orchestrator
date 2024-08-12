import {
  CosmWasmClient,
  SigningCosmWasmClient,
} from "@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import env from "../configs/env";

export const wrappedExecuteTransaction = async (fn: () => Promise<void>) => {
  while (true) {
    try {
      await fn();
      break;
    } catch (error) {
      let message = error?.message;
      if (message?.includes("account sequence mismatch")) {
        continue;
      } else {
        console.log(`[UNEXPECTED ERROR] ${message}`);
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
  prefix: string,
  gasPrice: GasPrice
) => {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    env.cosmos.mnemonic,
    {
      prefix,
    }
  );
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
