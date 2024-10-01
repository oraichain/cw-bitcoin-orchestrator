import { AppBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import env from "../configs/env";
import { OraichainConfig } from "../configs/networks";
import { initSignerClient } from "../utils/cosmos";
import { decryptMnemonic } from "../utils/mnemonic";

const main = async () => {
  let mnemonic = env.cosmos.mnemonic;
  if (!mnemonic) {
    mnemonic = decryptMnemonic(
      "Mnemonic passphrase:",
      env.cosmos.encryptedMnemonic
    );
  }

  const { prefix, gasPrice } = OraichainConfig;

  const { sender, client } = await initSignerClient(
    env.cosmos.rpcUrl,
    mnemonic,
    prefix,
    gasPrice
  );
  const appBitcoinClient = new AppBitcoinClient(
    client,
    sender,
    env.cosmos.appBitcoin
  );
  const isEligible = await appBitcoinClient.checkEligibleValidator({
    valAddr: sender,
  });
  if (isEligible) {
    console.log("You are eligible to be a signer");
  }
  if (!isEligible) {
    console.log("You are not eligible to be a signer");
  }
  return;
};

export default async () => {
  await main();
};
