import { AppBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { encodeXpub } from "@oraichain/bitcoin-bridge-wasm-sdk";
import BIP32Factory from "bip32";
import { OraichainConfig } from "src/configs/networks";
import { initSignerClient } from "src/utils/cosmos";
import * as ecc from "tiny-secp256k1";
import env from "../configs/env";
import { getCurrentNetwork } from "../utils/bitcoin";

const main = async () => {
  let mnemonic = env.cosmos.mnemonic;
  const xpriv = "";
  const bip32 = BIP32Factory(ecc);
  const node = bip32.fromBase58(xpriv, getCurrentNetwork("bitcoin"));
  let xpub = node.neutered().toBase58();

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

  const realXpub = await appBitcoinClient.signatoryKey({
    addr: "orai1q53ujvvrcd0t543dsh5445lu6ar0qr2z9ll7ux",
  });
  console.log("Actually xpub:", { xpub }, "Expected xpub:", { xpub: realXpub });

  const signTxs = await appBitcoinClient.signingTxsAtCheckpointIndex({
    xpub,
    checkpointIndex: 52,
  });
  let sigs = [];
  for (const signTx of signTxs) {
    const [msg, sigsetIndex] = signTx;

    const key = node.derive(sigsetIndex);
    const sig = key.sign(Buffer.from(msg));
    sigs = [...sigs, Array.from(sig)];
  }

  const tx = await appBitcoinClient.submitCheckpointSignature({
    btcHeight: 875383,
    checkpointIndex: 52,
    sigs,
    xpub: encodeXpub({ key: xpub }),
  });
  console.log(`Signed checkpoint ${52} at ${tx.transactionHash}`);
};

main();
