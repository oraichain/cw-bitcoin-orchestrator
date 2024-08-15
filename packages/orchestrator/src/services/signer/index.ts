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
import { BlockHeader } from "../../@types";
import env from "../../configs/env";
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

  // SIGNING CHECKPOINT
  async startSigningCheckpoint(xpriv: string, xpub: string) {
    const bip32 = BIP32Factory(ecc);

    while (true) {
      try {
        const blockchainInfo = await this.btcClient.getblockchaininfo();
        const btcHeight = blockchainInfo.blocks;
        let buildingIndex = await this.cwBitcoinClient.buildingIndex();
        let previousIndex = buildingIndex - 1;
        let checkpoint = await this.cwBitcoinClient.checkpointByIndex({
          index: previousIndex,
        });

        if (checkpoint.status === "signing") {
          await this.checkChangeRate();

          // Fetch current block
          let sidechainBlockHash =
            await this.cwBitcoinClient.sidechainBlockHash();
          let sidechainHeader: BlockHeader =
            await this.btcClient.getblockheader({
              blockhash: sidechainBlockHash,
              verbose: true,
            });
          let currentHeight = sidechainHeader.height;

          // Fetch latest signed checkpoint height
          let previousCheckpoint = await this.cwBitcoinClient.checkpointByIndex(
            {
              index: previousIndex - 1,
            }
          );
          let signedAtBtcHeight = previousCheckpoint.signed_at_btc_height;

          // Validate "circuit breaker" mechanism
          if (signedAtBtcHeight !== null && signedAtBtcHeight !== undefined) {
            let delta =
              signedAtBtcHeight +
              env.signer.minBlocksPerCheckpoint -
              currentHeight;

            if (delta > 0) {
              throw new Error(
                `Checkpoint is too recent, ${delta} more Bitcoin block${
                  delta > 1 ? "s" : ""
                } required`
              );
            }
          }

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
      } catch (err) {
        console.log(`[START_CHECKPOINT_SIGNING] ${err?.message}`);
      }

      await setTimeout(ITERATION_DELAY * 10);
    }
  }

  async checkChangeRate() {
    const { withdrawal, sigset_change } =
      await this.cwBitcoinClient.changeRates({
        interval: env.signer.legitimateCheckpointInterval,
      });
    let sigsetChangeRate = sigset_change / 10000;
    let withdrawalRate = withdrawal / 10000;

    if (withdrawalRate > env.signer.maxWithdrawalRate) {
      throw new Error(
        `Withdrawal rate of ${withdrawalRate} is above maximum of ${env.signer.maxWithdrawalRate}`
      );
    }

    if (sigsetChangeRate > env.signer.sigsetChangeRate) {
      throw new Error(
        `Sigset change rate of ${sigsetChangeRate} is above maximum of ${env.signer.sigsetChangeRate}`
      );
    }
  }

  // SIGNING RECOVERY
  async startRecoveryTxSigning(xpriv: string, xpub: string) {
    const bip32 = BIP32Factory(ecc);

    while (true) {
      try {
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
      } catch (err) {
        console.log(`[START_RECOVERY_SIGNING] ${err?.message}`);
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
