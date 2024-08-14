import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { encodeXpub } from "@oraichain/bitcoin-bridge-wasm-sdk";
import BIP32Factory, { BIP32Interface } from "bip32";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { RPCClient } from "rpc-bitcoin";
import { setTimeout } from "timers/promises";
import * as ecc from "tiny-secp256k1";
import { ITERATION_DELAY } from "../../constants";
import { getCurrentNetwork } from "../../utils/bitcoin";
import { wrappedExecuteTransaction } from "../../utils/cosmos";
import { RelayerInterface } from "../common/relayer.interface";

class SignerService implements RelayerInterface {
  btcClient: RPCClient;
  cwBitcoinClient: CwBitcoinClient;

  constructor(btcClient: RPCClient, cwBitcoinClient: CwBitcoinClient) {
    this.btcClient = btcClient;
    this.cwBitcoinClient = cwBitcoinClient;
  }

  async relay() {
    let { xpriv, xpub } = await this.loadOrGenerateXpriv();

    await Promise.all([
      this.startSigningCheckpoint(xpriv, xpub),
      this.startRecoveryTxSigning(xpriv, xpub),
    ]);
  }

  async startSigningCheckpoint(xpriv: string, xpub: string) {
    const bip32 = BIP32Factory(ecc);

    while (true) {
      const blockchainInfo = await this.btcClient.getblockchaininfo();
      const btcHeight = blockchainInfo.blocks;
      let buildingIndex = await this.cwBitcoinClient.buildingIndex();
      let previousIndex = buildingIndex - 1;
      let checkpoint = await this.cwBitcoinClient.checkpointByIndex({
        index: previousIndex,
      });

      if (checkpoint.status === "signing") {
        let signTxs = await this.cwBitcoinClient.signingTxsAtCheckpointIndex({
          xpub: encodeXpub({ key: xpub }),
          checkpointIndex: previousIndex,
        });

        if (signTxs.length > 0) {
          let sigs = [];
          for (const signTx of signTxs) {
            const [msg, sigsetIndex] = signTx;
            const node = bip32.fromBase58(xpriv, getCurrentNetwork());
            const key = node.derive(sigsetIndex);
            const sig = key.sign(Buffer.from(msg));
            sigs = [...sigs, Array.from(sig)];
          }
          await wrappedExecuteTransaction(async () => {
            const tx = await this.cwBitcoinClient.submitCheckpointSignature({
              btcHeight,
              checkpointIndex: previousIndex,
              sigs,
              xpub: encodeXpub({ key: xpub }),
            });
            console.log(
              `Signed checkpoint ${previousIndex} at ${tx.transactionHash}`
            );
          });
        }
      }

      await setTimeout(ITERATION_DELAY * 10);
    }
  }

  async startRecoveryTxSigning(xpriv: string, xpub: string) {
    const bip32 = BIP32Factory(ecc);

    while (true) {
      let signTxs = await this.cwBitcoinClient.signingRecoveryTxs({
        xpub: encodeXpub({ key: xpub }),
      });
      let sigs = [];

      if (signTxs.length > 0) {
        for (const signTx of signTxs) {
          const [msg, sigsetIndex] = signTx;
          const node = bip32.fromBase58(xpriv, getCurrentNetwork());
          const key = node.derive(sigsetIndex);
          const sig = key.sign(Buffer.from(msg));
          sigs = [...sigs, Array.from(sig)];
        }

        await wrappedExecuteTransaction(async () => {
          const tx = await this.cwBitcoinClient.submitRecoverySignature({
            sigs,
            xpub: encodeXpub({ key: xpub }),
          });
          console.log(`Signed recovery transaction at ${tx.transactionHash}`);
        });
      }

      await setTimeout(ITERATION_DELAY * 10);
    }
  }

  async loadOrGenerateXpriv(): Promise<{ xpriv: string; xpub: string }> {
    const homeDir = os.homedir();
    const signerDirPath = path.join(homeDir, ".oraibtc-relayer/signer");
    if (!fs.existsSync(signerDirPath)) {
      fs.mkdirSync(signerDirPath, { recursive: true });
    }
    const xprivPath = path.join(signerDirPath, "xpriv");

    let node: BIP32Interface;
    const bip32 = BIP32Factory(ecc);
    if (!fs.existsSync(xprivPath)) {
      const seed = crypto.randomBytes(32);
      node = bip32.fromSeed(seed, getCurrentNetwork());
      let xpriv = node.toBase58();
      fs.writeFileSync(xprivPath, xpriv);
    } else {
      const fileContent = fs.readFileSync(xprivPath, "utf-8");
      node = bip32.fromBase58(fileContent, getCurrentNetwork());
    }
    let xpriv = node.toBase58();
    let xpub = node.neutered().toBase58();
    return {
      xpriv,
      xpub,
    };
  }
}

export default SignerService;
