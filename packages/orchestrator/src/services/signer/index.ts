import {
  AppBitcoinClient,
  LightClientBitcoinClient,
} from "@oraichain/bitcoin-bridge-contracts-sdk";
import { BitcoinNetwork } from "@oraichain/bitcoin-bridge-lib-js";
import { encodeXpub } from "@oraichain/bitcoin-bridge-wasm-sdk";
import BIP32Factory, { BIP32Interface } from "bip32";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { setTimeout } from "timers/promises";
import * as ecc from "tiny-secp256k1";
import { Logger } from "winston";
import env from "../../configs/env";
import { logger } from "../../configs/logger";
import { ITERATION_DELAY } from "../../constants";
import { getCurrentNetwork } from "../../utils/bitcoin";
import { wrappedExecuteTransaction } from "../../utils/cosmos";
import { RelayerInterface } from "../common/relayer.interface";
import ContractSimulator from "../contract-simulate";

class SignerService implements RelayerInterface {
  lightClientBitcoinClient: LightClientBitcoinClient;
  appBitcoinClient: AppBitcoinClient;
  network?: BitcoinNetwork;
  logger: Logger;

  constructor(
    lightClientBitcoinClient: LightClientBitcoinClient,
    appBitcoinClient: AppBitcoinClient,
    network?: BitcoinNetwork
  ) {
    this.lightClientBitcoinClient = lightClientBitcoinClient;
    this.appBitcoinClient = appBitcoinClient;
    this.network = network;
    this.logger = logger("SignerService");
  }

  async relay() {
    this.logger.info(`Starting signer server!`);
    let { xpriv, xpub } = await this.loadOrGenerateXpriv();
    ContractSimulator.sync();
    // const signatoryKey = await this.appBitcoinClient.signatoryKey({
    //   addr: this.appBitcoinClient.sender,
    // });

    // if (signatoryKey === null) {
    //   const tx = await this.appBitcoinClient.setSignatoryKey({
    //     xpub: encodeXpub({ key: xpub }),
    //   });
    //   this.logger.info(`Setting signatory key at: ${tx.transactionHash}`);
    // }

    this.logger.info(`Signer is running...`);
    await Promise.all([
      this.startRelay({
        xpriv,
        xpub,
      }),
    ]);
  }

  async startRelay({ xpriv, xpub }: { xpriv: string; xpub: string }) {
    await this.startSigningCheckpoint(xpriv, xpub);
    await this.startRecoveryTxSigning(xpriv, xpub);
  }

  // SIGNING CHECKPOINT
  async startSigningCheckpoint(xpriv: string, xpub: string) {
    const bip32 = BIP32Factory(ecc);

    const node = bip32.fromBase58(xpriv, getCurrentNetwork(this.network));

    while (true) {
      if (!ContractSimulator.initialized) {
        await setTimeout(ITERATION_DELAY.RELAY_SIGNATURES_INTERVAL);
        continue;
      }
      try {
        let btcHeight = await this.lightClientBitcoinClient.headerHeight();
        let buildingIndex = await this.appBitcoinClient.buildingIndex();
        let previousIndex = buildingIndex - 1;

        if (previousIndex < 0) {
          await setTimeout(ITERATION_DELAY.RELAY_SIGNATURES_INTERVAL);
          continue;
        }

        let checkpoint = await this.appBitcoinClient.checkpointByIndex({
          index: previousIndex,
        });

        if (checkpoint.status === "signing") {
          await this.checkChangeRate();
          let signTxs =
            await ContractSimulator.simulateAppCwBitcoin.signingTxsAtCheckpointIndex(
              {
                xpub: encodeXpub({ key: xpub }),
                checkpointIndex: previousIndex,
              }
            );

          if (signTxs.length > 0) {
            // Fetch latest signed checkpoint height
            await this.circuitBreaker(previousIndex);

            let sigs = [];
            for (const signTx of signTxs) {
              const [msg, sigsetIndex] = signTx;

              const key = node.derive(sigsetIndex);
              const sig = key.sign(Buffer.from(msg));
              sigs = [...sigs, Array.from(sig)];
            }
            await wrappedExecuteTransaction(async () => {
              const tx = await this.appBitcoinClient.submitCheckpointSignature({
                btcHeight,
                checkpointIndex: previousIndex,
                sigs,
                xpub: encodeXpub({ key: xpub }),
              });
              this.logger.info(
                `Signed checkpoint ${previousIndex} at ${tx.transactionHash}`
              );
            }, this.logger);
          }
        }
      } catch (err) {
        this.logger.error(`[START_CHECKPOINT_SIGNING] Error:`, err);
      }

      await setTimeout(ITERATION_DELAY.RELAY_SIGNATURES_INTERVAL);
    }
  }

  async circuitBreaker(previousIndex: number) {
    // Fetch current block
    let currentHeight = await this.lightClientBitcoinClient.headerHeight();

    let signedAtBtcHeight = undefined;

    if (previousIndex - 1 >= 0) {
      let previousCheckpoint = await this.appBitcoinClient.checkpointByIndex({
        index: previousIndex - 1,
      });
      signedAtBtcHeight = previousCheckpoint.signed_at_btc_height;
    }

    // Validate "circuit breaker" mechanism
    if (signedAtBtcHeight !== null && signedAtBtcHeight !== undefined) {
      let delta =
        signedAtBtcHeight + env.signer.minBlocksPerCheckpoint - currentHeight;
      if (delta > 0) {
        throw new Error(
          `Checkpoint is too recent, ${delta} more Bitcoin block${
            delta > 1 ? "s" : ""
          } required`
        );
      }
    }
  }

  async checkChangeRate() {
    const { withdrawal, sigset_change } =
      await ContractSimulator.simulateAppCwBitcoin.changeRates({
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
    const node = bip32.fromBase58(xpriv, getCurrentNetwork(this.network));

    while (true) {
      if (!ContractSimulator.initialized) {
        await setTimeout(ITERATION_DELAY.RELAY_SIGNATURES_INTERVAL);
        continue;
      }
      try {
        let signTxs =
          await ContractSimulator.simulateAppCwBitcoin.signingRecoveryTxs({
            xpub: encodeXpub({ key: xpub }),
          });
        let sigs = [];

        if (signTxs.length > 0) {
          for (const signTx of signTxs) {
            const [msg, sigsetIndex] = signTx;

            const key = node.derive(sigsetIndex);
            const sig = key.sign(Buffer.from(msg));
            sigs = [...sigs, Array.from(sig)];
          }

          await wrappedExecuteTransaction(async () => {
            const tx = await this.appBitcoinClient.submitRecoverySignature({
              sigs,
              xpub: encodeXpub({ key: xpub }),
            });
            this.logger.info(
              `Signed recovery transaction at ${tx.transactionHash}`
            );
          }, this.logger);
        }
      } catch (err) {
        this.logger.error(`[START_RECOVERY_SIGNING] Error:`, err);
      }

      await setTimeout(ITERATION_DELAY.RELAY_SIGNATURES_INTERVAL);
    }
  }

  async loadOrGenerateXpriv(): Promise<{ xpriv: string; xpub: string }> {
    const homeDir = os.homedir();
    const signerDirPath = path.join(
      homeDir,
      `${env.server.storageDirName}/signer`
    );
    if (!fs.existsSync(signerDirPath)) {
      fs.mkdirSync(signerDirPath, { recursive: true });
    }
    const xprivPath = path.join(signerDirPath, "xpriv");

    let node: BIP32Interface;
    const bip32 = BIP32Factory(ecc);
    if (!fs.existsSync(xprivPath)) {
      const seed = crypto.randomBytes(32);
      node = bip32.fromSeed(seed, getCurrentNetwork(this.network));
      let xpriv = node.toBase58();
      fs.writeFileSync(xprivPath, xpriv);
    } else {
      const fileContent = fs.readFileSync(xprivPath, "utf-8");
      node = bip32.fromBase58(
        fileContent.trim(),
        getCurrentNetwork(this.network)
      );
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
