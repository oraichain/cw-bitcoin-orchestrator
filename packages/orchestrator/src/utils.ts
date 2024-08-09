import {
  CosmWasmClient,
  SigningCosmWasmClient,
} from "@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import env from "./configs/env";
import { Network } from "./configs/networks";

export const initQueryClient = async () => {
  const client = await CosmWasmClient.connect(env.cosmos.rpcUrl);
  return client;
};

export const initSignerClient = async (network: Network) => {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    env.cosmos.mnemonic,
    {
      prefix: network.prefix,
    }
  );
  const [firstAccount] = await wallet.getAccounts();
  const client = await SigningCosmWasmClient.connectWithSigner(
    env.cosmos.rpcUrl,
    wallet,
    {
      gasPrice: network.gasPrice,
      broadcastPollIntervalMs: 500,
    }
  );

  return {
    sender: firstAccount.address,
    client,
  };
};
