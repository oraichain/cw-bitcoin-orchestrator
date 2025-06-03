import {
  AppBitcoinClient,
  LightClientBitcoinClient,
} from "@oraichain/bitcoin-bridge-contracts-sdk";
import { Dest } from "@oraichain/bitcoin-bridge-contracts-sdk/build/AppBitcoin.types";
import { WrappedHeader } from "@oraichain/bitcoin-bridge-contracts-sdk/build/LightClientBitcoin.types";
import { BitcoinNetwork, redeemScript } from "@oraichain/bitcoin-bridge-lib-js";
import {
  DepositInfo,
  commitmentBytes,
  decodeRawTx,
  fromBinaryMerkleBlock,
  fromBinaryTransaction,
  getBitcoinTransactionTxid,
  newWrappedHeader,
  toBinaryPartialMerkleTree,
  toBinaryTransaction,
  toReceiverAddr,
} from "@oraichain/bitcoin-bridge-wasm-sdk";
import { RPCClient } from "@oraichain/rpc-bitcoin";
import * as btc from "bitcoinjs-lib";
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
  SCAN_BLOCKS_CHUNK_SIZE,
  SCAN_MEMPOOL_CHUNK_SIZE,
  SUBMIT_RELAY_CHECKPOINT_INTERVAL_DELAY,
  SUBMIT_RELAY_RECOVERY_TX_INTERVAL_DELAY,
} from "../../constants";
import { chunkArray, mapSlice } from "../../utils/array";
import {
  ScriptPubkeyType,
  calculateOutpointKey,
  decodeAddress,
  getCurrentNetwork,
  toScriptPubKeyP2WSH,
} from "../../utils/bitcoin";
import { trackExecutionTime } from "../../utils/catchAsync";
import { wrappedExecuteTransaction } from "../../utils/cosmos";
import { convertSdkDestToWasmDest } from "../../utils/dest";
import BlockHeaderService from "../block_header";
import { RelayerInterface } from "../common/relayer.interface";
import { DuckDbNode } from "../db";
import DepositIndexService from "../deposit_index";
import RelayedSetService from "../relayed_set";
import WatchedScriptsService from "../watched_scripts";

export default class RelayerService implements RelayerInterface {
  watchedScriptClient: WatchedScriptsService;
  depositIndexService: DepositIndexService;
  relayedSetService: RelayedSetService;
  blockHeaderService: BlockHeaderService;
  lastBlockHeight: number = 0;
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
    this.depositIndexService = new DepositIndexService(db);
    this.relayedSetService = new RelayedSetService(db);
    this.blockHeaderService = new BlockHeaderService(btcClient, db);
    this.network = network;
    this.logger = logger("RelayerService");
  }

  async relay() {
    this.logger.info(`Relayer is running...`);
    let lastHash = null;
    let prevTip = null;
    this.trackMemoryLeak();
    while (true) {
      lastHash = await this.relayHeader(lastHash);
      let currentHash = await this.btcClient.getbestblockhash();
      if (currentHash !== lastHash) {
        this.logger.info("Waiting for next header...");
        await setTimeout(3000);
        continue;
      }
      prevTip = await this.relayDeposit(prevTip);
      await this.relayRecoveryDeposits();
      await this.relayCheckpoints();
      await this.relayCheckpointConf();
      if (global.gc) {
        global.gc?.({
          execution: "sync",
        });
        this.logger.info("Garbage collection is done!");
      }
      await setTimeout(10000);
    }
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
  async relayHeader(lastHash: string | null) {
    this.logger.info("Starting header relay...");
    try {
      const fullNodeHash = await this.btcClient.getbestblockhash();
      const sideChainHash =
        await this.lightClientBitcoinClient.sidechainBlockHash();
      console.log({
        fullNodeHash,
        sideChainHash,
      });

      if (fullNodeHash !== sideChainHash) {
        await this.relayHeaderBatch(fullNodeHash, sideChainHash);
        // Delay between headers
        return lastHash;
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
    return lastHash;
  }

  async relayHeaderBatch(fullNodeHash: string, sideChainHash: string) {
    const fullNodeInfo = await this.blockHeaderService.getBlockHeader(
      fullNodeHash
    );
    const sideChainInfo = await this.blockHeaderService.getBlockHeader(
      sideChainHash
    );
    if (fullNodeInfo.height < sideChainInfo.height) {
      this.logger.info("Full node is still syncing with real running node!");
      return;
    }
    let startHeader = await this.commonAncestor(fullNodeHash, sideChainHash);
    let wrappedHeaders = await this.getHeaderBatch(startHeader.hash);

    if (wrappedHeaders.length > 0) {
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
    }
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
        wrappedHeaders.push(wrappedHeader);
      }
    }
    return wrappedHeaders;
  }

  async commonAncestor(
    leftHash: string,
    rightHash: string
  ): Promise<BlockHeader> {
    let leftHeader = await this.blockHeaderService.getBlockHeader(leftHash);
    let rightHeader = await this.blockHeaderService.getBlockHeader(rightHash);
    while (leftHeader.hash !== rightHeader.hash) {
      if (
        leftHeader.height > rightHeader.height &&
        rightHeader.confirmations - 1 === leftHeader.height - rightHeader.height
      ) {
        return rightHeader;
      } else if (
        rightHeader.height > leftHeader.height &&
        leftHeader.confirmations - 1 === rightHeader.height - leftHeader.height
      ) {
        return leftHeader;
      } else if (leftHeader.height > rightHeader.height) {
        let prev = leftHeader.previousblockhash;
        leftHeader = await this.blockHeaderService.getBlockHeader(prev);
      } else {
        let prev = rightHeader.previousblockhash;
        rightHeader = await this.blockHeaderService.getBlockHeader(prev);
      }
    }

    return leftHeader;
  }

  // [RELAY_DEPOSIT]
  async relayDeposit(prevTip: string | null) {
    this.logger.info("Starting deposit relay...");
    try {
      this.logger.info("Scanning mempool for deposit transactions...");

      // Mempool handler
      await trackExecutionTime(
        async () => {
          await this.scanTxsFromMempools();
        },
        "scanTxsFromMempools",
        this.logger
      );

      // Block handler
      const tip = await this.lightClientBitcoinClient.sidechainBlockHash();
      if (prevTip === tip) {
        throw new Error(
          "Current tip block is scanned for relaying. Waiting for next header..."
        );
      }
      prevTip = prevTip || tip;
      let startHeight = (
        await trackExecutionTime(
          async () => {
            return this.commonAncestor(tip, prevTip);
          },
          "commonAncestor",
          this.logger
        )
      ).height;

      let endHeader: BlockHeader = await this.blockHeaderService.getBlockHeader(
        tip
      );
      let endHeight = endHeader.height;
      let numBlocks = Math.max(
        endHeight - startHeight,
        RELAY_DEPOSIT_BLOCKS_SIZE
      );
      this.logger.info(
        `Scanning ${numBlocks} blocks for deposit transactions...`
      );
      await trackExecutionTime(
        async () => {
          await this.scanDeposits(numBlocks);
        },
        "scanDeposits",
        this.logger
      );
      prevTip = tip;

      this.logger.info("Waiting some seconds for next scan...");
    } catch (err) {
      if (!err?.message.includes("Waiting for next header...")) {
        this.logger.error("[RELAY_DEPOSIT] Error:", err);
      }
    }

    return prevTip;
  }

  async scanTxsFromMempools() {
    try {
      const allMempoolTxs = await this.btcClient.getrawmempool();
      const mempoolTxs = (
        await Promise.all(
          allMempoolTxs
            .filter((item: string) => item !== null)
            .map(async (txid: string) => {
              const result = await this.relayedSetService.exist(
                `relay-deposit-${txid}`
              );
              return result ? undefined : txid;
            })
        )
      ).filter((item) => item);

      let i = 0;
      while (i < mempoolTxs.length) {
        const txChunk = mapSlice(
          mempoolTxs,
          i,
          SCAN_MEMPOOL_CHUNK_SIZE,
          (txid: string) => ({
            method: "getrawtransaction",
            params: [txid, true],
          })
        );

        i += SCAN_MEMPOOL_CHUNK_SIZE;

        let detailMempoolTxs: BitcoinTransaction[] = (
          await this.btcClient.batch(txChunk)
        ).map((item) => item.result);
        for (const tx of detailMempoolTxs) {
          if (!tx?.txid) {
            continue;
          }
          let txid = tx.txid;
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
      }
    } catch (err) {
      this.logger.error(`[SCAN_TX_FROM_MEMPOOL] Error:`, err);
    }
  }

  async scanDeposits(numBlocks: number) {
    try {
      let sidechainHeight = await this.lightClientBitcoinClient.headerHeight();
      let allHeightQuerier = [];
      for (let i = 0; i < numBlocks; i++) {
        allHeightQuerier.push({
          method: "getblockhash",
          params: [sidechainHeight - i],
        });
      }
      if (allHeightQuerier.length === 0) {
        return;
      }

      const chunkHeightQuerier = chunkArray(allHeightQuerier, 50);
      for (const allHeightQuerier of chunkHeightQuerier) {
        let allBlockhashes = (await this.btcClient.batch(allHeightQuerier)).map(
          (item) => item.result
        );
        let i = 0;
        while (i < allBlockhashes.length) {
          const blockhashChunk = mapSlice(
            allBlockhashes,
            i,
            SCAN_BLOCKS_CHUNK_SIZE,
            (blockhash: string) => ({
              method: "getblock",
              params: [blockhash, 2],
            })
          );
          i += SCAN_BLOCKS_CHUNK_SIZE;

          let allDetailBlocks: BitcoinBlock[] = (
            await this.btcClient.batch(blockhashChunk)
          ).map((item) => item.result);
          for (const block of allDetailBlocks) {
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
          }
        }
        await this.watchedScriptClient.removeExpired();
      }
    } catch (err) {
      this.logger.error(`[SCAN_DEPOSITS] Error:`, err);
    }
  }

  async filterDepositTxs(txs: BitcoinTransaction[]) {
    let results = await Promise.all(
      txs.map(async (tx: BitcoinTransaction) => {
        let outputs = tx.vout;
        for (const output of outputs) {
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
      blocks.push(block);
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

      console.log({
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
    try {
      const txs = await this.appBitcoinClient.signedRecoveryTxs();
      for (const recoveryTx of txs) {
        const existed = await this.relayedSetService.exist(
          `relay-recovery-deposits-${recoveryTx}`
        );
        if (existed) {
          await setTimeout(SUBMIT_RELAY_RECOVERY_TX_INTERVAL_DELAY);
          continue;
        }
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
  }

  // [RELAY CHECKPOINT]
  async relayCheckpoints() {
    this.logger.info("Starting checkpoint relay...");
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
          if (tx !== null) {
            await this.relayedSetService.insert(
              `relay-checkpoint-${checkpoint}`
            );
          }
          this.logger.info(`Relayed checkpoint tx ${tx}`);
        } catch (err) {
          console.log("err", err);
        }

        await setTimeout(SUBMIT_RELAY_CHECKPOINT_INTERVAL_DELAY);
      }
    } catch (err) {
      this.logger.error(`[RELAY_CHECKPOINT] Error:`, err);
    }
  }

  // [RELAY CHECKPOINT CONFIRM]
  async relayCheckpointConf() {
    this.logger.info("Starting checkpoint confirm relay...");
    try {
      let confirmedIndex = await this.appBitcoinClient.confirmedIndex();
      let unconfirmedIndex =
        await this.appBitcoinClient.unhandledConfirmedIndex();
      console.log("confirmedIndex", confirmedIndex);
      console.log("unconfirmedIndex", unconfirmedIndex);
      let lastCompletedIndex = await this.appBitcoinClient.completedIndex();

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

      let rawTx = await this.appBitcoinClient.checkpointTx({
        index: unconfIndex,
      });

      const tx = fromBinaryTransaction(Buffer.from(rawTx, "base64"));

      const blockHash =
        await this.lightClientBitcoinClient.sidechainBlockHash();
      const blockHeader = await this.blockHeaderService.getBlockHeader(
        blockHash
      );

      const btcHeight = blockHeader.height;

      const config = await this.appBitcoinClient.bitcoinConfig();
      const minConfs = config.min_confirmations;

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
          return;
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
    const currentBtcHeight = await this.lightClientBitcoinClient.headerHeight();
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

    let currentTime = Math.floor(Date.now() / 1000) + 4 * 60 * 60 * 24;
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
