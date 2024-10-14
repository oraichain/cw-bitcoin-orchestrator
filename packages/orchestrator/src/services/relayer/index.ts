import {
  AppBitcoinClient,
  LightClientBitcoinClient,
} from "@oraichain/bitcoin-bridge-contracts-sdk";
import {
  Dest,
  WrappedHeader,
} from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import { BitcoinNetwork, redeemScript } from "@oraichain/bitcoin-bridge-lib-js";
import {
  commitmentBytes,
  decodeRawTx,
  DepositInfo,
  fromBinaryMerkleBlock,
  fromBinaryTransaction,
  getBitcoinTransactionTxid,
  newWrappedHeader,
  toBinaryPartialMerkleTree,
  toBinaryTransaction,
  toReceiverAddr,
} from "@oraichain/bitcoin-bridge-wasm-sdk";
import * as btc from "bitcoinjs-lib";
import process from "process";
import { RPCClient } from "rpc-bitcoin";
import { setTimeout } from "timers/promises";
import { Logger } from "winston";
import {
  BitcoinBlock,
  BitcoinTransaction,
  BlockHeader,
  VerbosedBlockHeader,
} from "../../@types";
import env from "../../configs/env";
import { logger } from "../../configs/logger";
import {
  ITERATION_DELAY,
  RELAY_DEPOSIT_BLOCKS_SIZE,
  RELAY_HEADER_BATCH_SIZE,
  SCAN_BLOCK_TXS_INTERVAL_DELAY,
  SCAN_MEMPOOL_CHUNK_INTERVAL_DELAY,
  SCAN_MEMPOOL_CHUNK_SIZE,
  SUBMIT_RELAY_CHECKPOINT_INTERVAL_DELAY,
  SUBMIT_RELAY_RECOVERY_TX_INTERVAL_DELAY,
} from "../../constants";
import { chunkArray } from "../../utils/array";
import {
  calculateOutpointKey,
  decodeAddress,
  getCurrentNetwork,
  ScriptPubkeyType,
  toScriptPubKeyP2WSH,
} from "../../utils/bitcoin";
import { wrappedExecuteTransaction } from "../../utils/cosmos";
import { convertSdkDestToWasmDest } from "../../utils/dest";
import BlockHeaderService from "../block_header";
import { RelayerInterface } from "../common/relayer.interface";
import { DuckDbNode } from "../db";
import DepositIndexService from "../deposit_index";
import RelayedSetService from "../relayed_set";
import WatchedScriptsService from "../watched_scripts";

class RelayerService implements RelayerInterface {
  static instances: RelayerService;
  watchedScriptClient: WatchedScriptsService;
  depositIndexService: DepositIndexService;
  relayedSetService: RelayedSetService;
  blockHeaderService: BlockHeaderService;
  logger: Logger;

  constructor(
    protected btcClient: RPCClient,
    protected lightClientBitcoinClient: LightClientBitcoinClient,
    protected appBitcoinClient: AppBitcoinClient,
    protected db: DuckDbNode,
    protected network?: BitcoinNetwork
  ) {
    this.btcClient = btcClient;
    this.lightClientBitcoinClient = lightClientBitcoinClient;
    this.appBitcoinClient = appBitcoinClient;
    this.watchedScriptClient = new WatchedScriptsService(
      db,
      this.appBitcoinClient
    );
    WatchedScriptsService.instances = this.watchedScriptClient;
    this.depositIndexService = new DepositIndexService(db);
    DepositIndexService.instances = this.depositIndexService;
    this.relayedSetService = new RelayedSetService(db);
    this.blockHeaderService = new BlockHeaderService(btcClient, db);
    this.network = network;
    this.logger = logger("RelayerService");
  }

  async relay() {
    this.logger.info(`Relayer is running...`);
    await Promise.all([
      this.relayHeader(),
      this.relayDeposit(),
      this.relayRecoveryDeposits(),
      this.relayCheckpoints(),
      this.relayCheckpointConf(),
      this.trackMemoryLeak(),
    ]);
  }

  // [TRACKER]
  async trackMemoryLeak() {
    while (true) {
      const used = process.memoryUsage();
      const currentHeapTotal = used.heapTotal / 1024 / 1024;
      const currentHeapUsed = used.heapUsed / 1024 / 1024;
      this.logger.info("=============================================");
      this.logger.info(
        `Memory heap total that GC predicts to allocate: ${currentHeapTotal} MB`
      );
      this.logger.info(
        `Memory heap total that GC actually used: ${currentHeapUsed} MB`
      );
      if (currentHeapUsed > 1200) {
        this.logger.error(
          `Heap is very high now, at ${currentHeapUsed} MB. Consider to check the process!`
        );
      }
      this.logger.info("=============================================");
      await setTimeout(ITERATION_DELAY.TRACK_MEMORY_LEAK);
    }
  }

  // [RELAY HEADER]
  async relayHeader() {
    this.logger.info("Starting header relay...");
    let lastHash = null;

    while (true) {
      try {
        let [fullNodeHash, sideChainHash] = await Promise.all([
          this.btcClient.getbestblockhash(),
          this.lightClientBitcoinClient.sidechainBlockHash(),
        ]);

        if (fullNodeHash !== sideChainHash) {
          await this.relayHeaderBatch(fullNodeHash, sideChainHash);
          // Delay between headers
          await setTimeout(ITERATION_DELAY.RELAY_HEADER_BATCH_DELAY);
          continue;
        }

        if (lastHash != fullNodeHash) {
          lastHash = fullNodeHash;
          const lastHashHeader: BlockHeader =
            await this.blockHeaderService.getBlockHeader(lastHash);
          this.logger.info(
            `Sidechain header state is up-to-date:\n\thash=${lastHashHeader.hash}\n\theight=${lastHashHeader.height}`
          );
        }
      } catch (err) {
        this.logger.error("[RELAY HEADER] Error:", err);
      }
      await setTimeout(ITERATION_DELAY.RELAY_HEADER_INTERVAL);
    }
  }

  async relayHeaderBatch(fullNodeHash: string, sideChainHash: string) {
    let [fullNodeInfo, sideChainInfo]: [BlockHeader, BlockHeader] =
      await Promise.all([
        this.blockHeaderService.getBlockHeader(fullNodeHash),
        this.blockHeaderService.getBlockHeader(sideChainHash),
      ]);

    if (fullNodeInfo.height < sideChainInfo.height) {
      this.logger.info("Full node is still syncing with real running node!");
      return;
    }
    let startHeader = await this.commonAncestor(fullNodeHash, sideChainHash);
    console.log({ startHeader });
    let wrappedHeaders = await this.getHeaderBatch(startHeader.hash);
    console.log({ wrappedHeaders });

    this.logger.info(
      `Relaying headers...\n\theight=${wrappedHeaders[0].height}\n\tbatches=${wrappedHeaders.length}`
    );

    await wrappedExecuteTransaction(async () => {
      const tx = await this.lightClientBitcoinClient.relayHeaders({
        headers: [...wrappedHeaders],
      });
      this.logger.info(`Relayed headers with tx hash: ${tx.transactionHash}`);
    }, this.logger);

    let currentSidechainBlockHash =
      await this.lightClientBitcoinClient.sidechainBlockHash();
    if (currentSidechainBlockHash === fullNodeHash) {
      this.logger.info("Relayed all headers");
    }
    return;
  }

  async getHeaderBatch(blockHash: string): Promise<WrappedHeader[]> {
    let cursorHeader: VerbosedBlockHeader =
      await this.blockHeaderService.getBlockHeader(blockHash);
    let wrappedHeaders = [];
    for (let i = 0; i < RELAY_HEADER_BATCH_SIZE; i++) {
      let nextHash = cursorHeader?.nextblockhash;

      if (nextHash !== undefined) {
        cursorHeader = await this.blockHeaderService.getBlockHeader(nextHash);
        const wrappedHeader: WrappedHeader = newWrappedHeader(
          {
            bits: parseInt(cursorHeader.bits, 16),
            merkle_root: cursorHeader.merkleroot,
            nonce: cursorHeader.nonce,
            prev_blockhash: cursorHeader.previousblockhash,
            time: cursorHeader.time,
            version: cursorHeader.version,
          },
          cursorHeader.height
        );
        wrappedHeaders = [...wrappedHeaders, wrappedHeader];
      }
    }
    return wrappedHeaders;
  }

  async commonAncestor(
    leftHash: string,
    rightHash: string
  ): Promise<BlockHeader> {
    let [leftHeader, rightHeader]: [BlockHeader, BlockHeader] =
      await Promise.all([
        this.blockHeaderService.getBlockHeader(leftHash),
        this.blockHeaderService.getBlockHeader(rightHash),
      ]);
    console.log("commonAncestor", leftHeader, rightHeader);
    while (leftHeader.hash !== rightHeader.hash) {
      if (
        leftHeader.height > rightHeader.height &&
        rightHeader.confirmations - 1 === leftHeader.height - rightHeader.height
      ) {
        console.log("Jump one:", rightHeader);
        return rightHeader;
      } else if (
        rightHeader.height > leftHeader.height &&
        leftHeader.confirmations - 1 === rightHeader.height - leftHeader.height
      ) {
        console.log("Jump one:", leftHeader);
        return leftHeader;
      } else if (leftHeader.height > rightHeader.height) {
        let prev = leftHeader.previousblockhash;
        leftHeader = await this.blockHeaderService.getBlockHeader(prev);
        console.log("leftHeader:", leftHeader);
      } else {
        let prev = rightHeader.previousblockhash;
        rightHeader = await this.blockHeaderService.getBlockHeader(prev);
        console.log("rightHeader:", rightHeader);
      }
    }

    return leftHeader;
  }

  // [RELAY_DEPOSIT]
  async relayDeposit() {
    this.logger.info("Starting deposit relay...");
    let prevTip = null;
    while (true) {
      try {
        this.logger.info("Scanning mempool for deposit transactions...");

        // Mempool handler
        await this.scanTxsFromMempools();

        // Block handler
        const tip = await this.lightClientBitcoinClient.sidechainBlockHash();
        if (prevTip === tip) {
          throw new Error(
            "Current tip block is scanned for relaying. Waiting for next header..."
          );
        }
        prevTip = prevTip || tip;
        let startHeight = (await this.commonAncestor(tip, prevTip)).height;

        let endHeader: BlockHeader =
          await this.blockHeaderService.getBlockHeader(tip);
        let endHeight = endHeader.height;
        let numBlocks = Math.max(
          endHeight - startHeight,
          RELAY_DEPOSIT_BLOCKS_SIZE
        );
        this.logger.info(
          `Scanning ${numBlocks} blocks for deposit transactions...`
        );
        await this.scanDeposits(numBlocks);
        prevTip = tip;

        this.logger.info("Waiting some seconds for next scan...");
      } catch (err) {
        if (!err?.message.includes("Waiting for next header...")) {
          this.logger.error("[RELAY_DEPOSIT] Error:", err);
        }
      }
      await setTimeout(ITERATION_DELAY.RELAY_DEPOSIT_INTERVAL);
    }
  }

  async scanTxsFromMempools() {
    try {
      let mempoolTxs = await this.btcClient.getrawmempool();
      const txChunks = chunkArray(mempoolTxs, SCAN_MEMPOOL_CHUNK_SIZE);
      for (const txChunk of txChunks) {
        let detailMempoolTxs: BitcoinTransaction[] = (
          await this.btcClient.batch([
            ...txChunk.map((txid: string) => ({
              method: "getrawtransaction",
              params: [txid, true],
            })),
          ])
        ).map((item) => item.result);
        for (const tx of detailMempoolTxs) {
          if (!tx?.txid) {
            continue;
          }
          let txid = tx.txid;
          const existed = await this.relayedSetService.exist(
            `relay-deposit-${txid}`
          );
          if (existed) continue;
          const outputs = tx.vout;

          for (let vout = 0; vout < outputs.length; vout++) {
            let output = outputs[vout];
            if (
              output.scriptPubKey.type != ScriptPubkeyType.WitnessScriptHash
            ) {
              continue;
            }

            const address = decodeAddress(output, this.network);
            if (address !== output.scriptPubKey.address) continue;

            const script = await this.watchedScriptClient.getScript(
              output.scriptPubKey.hex
            );

            if (!script) continue;

            this.logger.info(`Found pending deposit transaction ${txid}`);
            await this.relayedSetService.insert(`relay-deposit-${txid}`);
            await this.depositIndexService.insertDeposit({
              receiver: toReceiverAddr(convertSdkDestToWasmDest(script.dest)),
              bitcoinAddress: address,
              txid,
              vout,
              deposit: JSON.stringify({
                txid,
                vout,
                height: undefined,
                amount: output.value,
              }),
            });
          }
        }

        await setTimeout(SCAN_MEMPOOL_CHUNK_INTERVAL_DELAY);
      }
    } catch (err) {
      this.logger.error(`[SCAN_TX_FROM_MEMPOOL] Error:`, err);
    }
  }

  async scanDeposits(numBlocks: number) {
    try {
      let tip = await this.lightClientBitcoinClient.sidechainBlockHash();
      let hash = tip;
      for (let i = 0; i < numBlocks; i++) {
        let block: BitcoinBlock = await this.btcClient.getblock({
          blockhash: hash,
          verbosity: 2,
        });
        let txs = await this.filterDepositTxs(block.tx);
        for (const tx of txs) {
          try {
            await this.maybeRelayDeposit(tx, block.height, block.hash);
          } catch (err) {
            this.logger.error(
              `[MAYBE_RELAY_DEPOSIT] Error at tx ${tx.txid}:`,
              err
            );
          }
        }
        hash = block.previousblockhash;
        await setTimeout(SCAN_BLOCK_TXS_INTERVAL_DELAY);
      }
      // Remove expired
      await this.watchedScriptClient.removeExpired();
    } catch (err) {
      this.logger.error(`[SCAN_DEPOSITS] Error:`, err);
    }
  }

  async filterDepositTxs(txs: BitcoinTransaction[]) {
    let results = await Promise.all(
      txs.map(async (tx) => {
        let outputs = tx.vout;
        for (let i = 0; i < outputs.length; i++) {
          let output = outputs[i];
          if (output.scriptPubKey.type == ScriptPubkeyType.WitnessScriptHash) {
            let script = await this.watchedScriptClient.getScript(
              output.scriptPubKey.hex
            );
            if (script) {
              return true;
            }
          }
        }
        return false;
      })
    );
    return txs.filter((_, i) => results[i]);
  }

  async lastNBlocks(numBlocks: number, tip: string): Promise<BitcoinBlock[]> {
    let blocks = [];
    let hash = tip; // use for traversing backwards
    for (let i = 0; i < numBlocks; i++) {
      let block: BitcoinBlock = await this.btcClient.getblock({
        blockhash: hash,
        verbosity: 2,
      });
      hash = block.previousblockhash;
      blocks = [...blocks, block];
    }
    return blocks;
  }

  async maybeRelayDeposit(
    tx: BitcoinTransaction,
    blockHeight: number,
    blockHash: string
  ) {
    const txid = tx.txid;
    const rawTx = tx.hex;
    const outputs = tx.vout;
    for (let i = 0; i < outputs.length; i++) {
      const output = outputs[i];

      if (output.scriptPubKey.type != ScriptPubkeyType.WitnessScriptHash)
        continue;

      const address = decodeAddress(output, this.network);
      if (address !== output.scriptPubKey.address) continue;

      const script = await this.watchedScriptClient.getScript(
        output.scriptPubKey.hex
      );

      if (!script) continue;

      const isExistOutpoint = await this.appBitcoinClient.processedOutpoint({
        key: calculateOutpointKey(txid, i),
      });

      if (isExistOutpoint === true) {
        // Remove this outpoint from deposit index
        await this.depositIndexService.removeDeposit({
          receiver: toReceiverAddr(convertSdkDestToWasmDest(script.dest)),
          bitcoinAddress: address,
          txid,
          vout: i,
        });
        continue;
      }

      await this.depositIndexService.insertDeposit({
        receiver: toReceiverAddr(convertSdkDestToWasmDest(script.dest)),
        bitcoinAddress: address,
        txid,
        vout: i,
        deposit: JSON.stringify({
          txid,
          vout: i,
          height: blockHeight,
          amount: output.value,
        }),
      });

      const txProof = await this.btcClient.gettxoutproof({
        txids: [txid],
        blockhash: blockHash,
      });

      await wrappedExecuteTransaction(async () => {
        const tx = await this.appBitcoinClient.relayDeposit({
          btcHeight: blockHeight,
          btcTx: Buffer.from(toBinaryTransaction(decodeRawTx(rawTx))).toString(
            "base64"
          ),
          btcProof: Buffer.from(
            toBinaryPartialMerkleTree(
              fromBinaryMerkleBlock(Buffer.from(txProof, "hex")).txn
            )
          ).toString("base64"),
          btcVout: i,
          dest: script.dest,
          sigsetIndex: Number(script.sigsetIndex),
        });
        this.logger.info(
          `Relayed deposit tx ${txid} at tx ${tx.transactionHash}`
        );
      }, this.logger);
    }
  }

  // [RELAY RECOVERY DEPOSITS]
  async relayRecoveryDeposits() {
    this.logger.info("Starting recovery deposit relay...");
    while (true) {
      try {
        const txs = await this.appBitcoinClient.signedRecoveryTxs();
        for (const recoveryTx of txs) {
          const existed = await this.relayedSetService.exist(
            `relay-recovery-deposits-${recoveryTx}`
          );
          if (existed) continue;
          const tx = await this.btcClient.sendrawtransaction({
            hexstring: Buffer.from(recoveryTx, "base64").toString("hex"),
          });
          await this.relayedSetService.insert(
            `relay-recovery-deposits-${recoveryTx}`
          );
          this.logger.info(`Relayed recovery tx ${tx}`);
          await setTimeout(SUBMIT_RELAY_RECOVERY_TX_INTERVAL_DELAY);
        }
      } catch (err) {
        this.logger.error(`[RELAY_RECOVERY_DEPOSIT] Error:`, err);
      }
      await setTimeout(ITERATION_DELAY.RELAY_RECOVERY_INTERVAL);
    }
  }

  // [RELAY CHECKPOINT]
  async relayCheckpoints() {
    this.logger.info("Starting checkpoint relay...");
    while (true) {
      try {
        const checkpoints = await this.appBitcoinClient.completedCheckpointTxs({
          limit: 1100,
        });
        for (const checkpoint of checkpoints) {
          const exist = await this.relayedSetService.exist(
            `relay-checkpoint-${checkpoint}`
          );
          if (exist) continue;
          try {
            const tx = await this.btcClient.sendrawtransaction({
              hexstring: Buffer.from(checkpoint, "base64").toString("hex"),
            });
            await this.relayedSetService.insert(
              `relay-checkpoint-${checkpoint}`
            );
            this.logger.info(`Relayed checkpoint tx ${tx}`);
          } catch (err) {}

          await setTimeout(SUBMIT_RELAY_CHECKPOINT_INTERVAL_DELAY);
        }
      } catch (err) {
        this.logger.error(`[RELAY_CHECKPOINT] Error:`, err);
      }
      await setTimeout(ITERATION_DELAY.RELAY_CHECKPOINT_INTERVAL);
    }
  }

  // [RELAY CHECKPOINT CONFIRM]
  async relayCheckpointConf() {
    this.logger.info("Starting checkpoint confirm relay...");
    while (true) {
      try {
        let [confirmedIndex, unconfirmedIndex, lastCompletedIndex] =
          await Promise.all([
            this.appBitcoinClient.confirmedIndex(),
            this.appBitcoinClient.unhandledConfirmedIndex(),
            this.appBitcoinClient.completedIndex(),
          ]);

        if (unconfirmedIndex === null) {
          throw new Error(
            "No unconfirmed checkpoint index. Waiting for next scan..."
          );
        }

        let unconfIndex = Math.max(unconfirmedIndex, lastCompletedIndex - 5);

        if (confirmedIndex !== null && confirmedIndex == unconfIndex) {
          throw new Error(
            "Unconfirmed checkpoint index is confirmed. Waiting for next scan..."
          );
        }

        let [tx, btcHeight, minConfs] = await Promise.all([
          (async () => {
            let rawTx = await this.appBitcoinClient.checkpointTx({
              index: unconfIndex,
            });
            return fromBinaryTransaction(Buffer.from(rawTx, "base64"));
          })(),
          (async () => {
            const blockHash =
              await this.lightClientBitcoinClient.sidechainBlockHash();
            const blockHeader = await this.blockHeaderService.getBlockHeader(
              blockHash
            );
            return blockHeader.height as number;
          })(),
          (async () => {
            const config = await this.appBitcoinClient.bitcoinConfig();
            return config.min_confirmations;
          })(),
        ]);
        let txid = getBitcoinTransactionTxid(tx);

        const exist = await this.relayedSetService.exist(
          `relay-checkpoint-conf-${txid}`
        );
        if (exist) {
          throw new Error(
            `Checkpoint confirm with tx ${txid} is already relayed`
          );
        }

        let maybeConf = await this.scanForTxid(txid, 5, 200);

        if (maybeConf !== null) {
          let [height, blockHash] = maybeConf;
          if (height > btcHeight - minConfs) {
            this.logger.info(
              `Waiting for more confirmations to relay checkpoint confirm with tx ${txid} ...`
            );
            await setTimeout(ITERATION_DELAY.RELAY_CHECKPOINT_CONF_INTERVAL);
            continue;
          }

          let txProof = await this.btcClient.gettxoutproof({
            txids: [txid],
            blockhash: blockHash,
          });
          await wrappedExecuteTransaction(async () => {
            const tx = await this.appBitcoinClient.relayCheckpoint({
              btcHeight: height,
              cpIndex: unconfIndex,
              btcProof: Buffer.from(
                toBinaryPartialMerkleTree(
                  fromBinaryMerkleBlock(Buffer.from(txProof, "hex")).txn
                )
              ).toString("base64"),
            });
            this.logger.info(
              `Relayed checkpoint confirmation with tx ${txid} at tx ${tx.transactionHash}`
            );
          }, this.logger);
          await this.relayedSetService.insert(`relay-checkpoint-conf-${txid}`);
        }
      } catch (err) {
        if (
          !err?.message.includes("Waiting for next scan...") &&
          !err?.message.includes("No completed checkpoints yet")
        ) {
          this.logger.error(`[RELAY_CHECKPOINT_CONF] Error:`, err);
        }
      }
      await setTimeout(ITERATION_DELAY.RELAY_CHECKPOINT_CONF_INTERVAL);
    }
  }

  async scanForTxid(
    txid: string,
    numBlocks: number,
    scanBlocks: number
  ): Promise<[number, string] | null> {
    let tip = await this.lightClientBitcoinClient.sidechainBlockHash();
    let baseHeader = await this.blockHeaderService.getBlockHeader(tip);
    let initialHeight = baseHeader.height;
    let baseHeight = initialHeight;

    while (true) {
      if (initialHeight - baseHeight >= scanBlocks) {
        break;
      }

      let blocks = await this.lastNBlocks(Math.min(numBlocks, baseHeight), tip);
      for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i];
        let height = baseHeight - i;
        let searchedTxid = block.tx.find((tx) => tx.txid === txid);
        if (searchedTxid !== undefined) {
          return [height, block.hash];
        }
      }

      let oldestBlock = blocks[blocks.length - 1].hash;
      if (tip === oldestBlock) break;
      tip = oldestBlock;
      baseHeight = (await this.blockHeaderService.getBlockHeader(tip)).height;
    }

    return null;
  }

  // [QUERY FUNCTIONS]
  async getPendingDeposits(receiver: string): Promise<DepositInfo[]> {
    const currentSidechainBlockHash =
      await this.lightClientBitcoinClient.sidechainBlockHash();
    const blockHeader: BlockHeader =
      await this.blockHeaderService.getBlockHeader(currentSidechainBlockHash);
    const currentBtcHeight = blockHeader.height;
    return this.depositIndexService.getDepositsByReceiver(
      receiver,
      currentBtcHeight
    );
  }

  // for testing purpose only
  async generateDepositAddress(
    checkpointIndex: number,
    dest: Dest,
    network: btc.networks.Network
  ) {
    const checkpoint = await (checkpointIndex
      ? this.appBitcoinClient.checkpointByIndex({
          index: checkpointIndex,
        })
      : this.appBitcoinClient.buildingCheckpoint());

    const checkpointConfig = await this.appBitcoinClient.checkpointConfig();
    const sigset = checkpoint.sigset;
    const encodedDest = commitmentBytes(convertSdkDestToWasmDest(dest));
    const depositScript = redeemScript(
      sigset,
      Buffer.from(encodedDest),
      checkpointConfig.sigset_threshold
    );
    let wsh = btc.payments.p2wsh({
      redeem: { output: depositScript },
      network,
    });
    let address = wsh.address;
    return address;
  }

  async submitDepositAddress(
    depositAddr: string,
    checkpointIndex: number,
    dest: Dest
  ): Promise<void> {
    const checkpoint = await (checkpointIndex
      ? this.appBitcoinClient.checkpointByIndex({
          index: checkpointIndex,
        })
      : this.appBitcoinClient.buildingCheckpoint());

    const checkpointConfig = await this.appBitcoinClient.checkpointConfig();
    const bitcoinConfig = await this.appBitcoinClient.bitcoinConfig();

    const sigset = checkpoint.sigset;
    const encodedDest = commitmentBytes(convertSdkDestToWasmDest(dest));
    const depositScript = redeemScript(
      sigset,
      Buffer.from(encodedDest),
      checkpointConfig.sigset_threshold
    );
    let wsh = btc.payments.p2wsh({
      redeem: { output: depositScript },
      network: getCurrentNetwork(this.network),
    });
    let address = wsh.address;

    if (address !== depositAddr) {
      throw new Error(
        `Generated address ${address} does not match the expected address ${depositAddr}`
      );
    }

    let currentTime = Math.floor(Date.now() / 1000);
    if (
      currentTime + env.deposit.depositBuffer >=
      sigset.create_time + bitcoinConfig.max_deposit_age
    ) {
      throw new Error(
        "Sigset no longer accepting deposits. Unable to generate deposit address"
      );
    }

    await this.watchedScriptClient.insertScript({
      address,
      script: toScriptPubKeyP2WSH(depositScript).toString("hex"),
      dest,
      sigsetIndex: BigInt(checkpoint.sigset.index),
      sigsetCreateTime: BigInt(checkpoint.sigset.create_time),
    });
  }
}

export default RelayerService;
