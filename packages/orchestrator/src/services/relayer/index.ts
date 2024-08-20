import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import {
  Dest,
  WrappedHeader,
} from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import {
  commitmentBytes,
  decodeRawTx,
  Deposit,
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
import { RPCClient } from "rpc-bitcoin";
import { setTimeout } from "timers/promises";
import {
  BitcoinBlock,
  BitcoinTransaction,
  BlockHeader,
  VerbosedBlockHeader,
} from "../../@types";
import {
  ITERATION_DELAY,
  RELAY_DEPOSIT_BLOCKS_SIZE,
  RELAY_HEADER_BATCH_SIZE,
  RETRY_DELAY,
} from "../../constants";
import {
  calculateOutpointKey,
  decodeAddress,
  getCurrentNetwork,
  redeemScript,
  ScriptPubkeyType,
  toScriptPubKeyP2WSH,
} from "../../utils/bitcoin";
import { retry } from "../../utils/catchAsync";
import { wrappedExecuteTransaction } from "../../utils/cosmos";
import { convertSdkDestToWasmDest } from "../../utils/dest";
import { getTxidKey, setNestedMap } from "../../utils/map";
import { RelayerInterface } from "../common/relayer.interface";
import { DuckDbNode } from "../db";
import WatchedScriptsService, {
  WatchedScriptsInterface,
} from "../watched_scripts";

interface RelayTxIdBody {
  tx: BitcoinTransaction;
  script: WatchedScriptsInterface;
}

class RelayerService implements RelayerInterface {
  static instances: RelayerService;
  btcClient: RPCClient;
  cwBitcoinClient: CwBitcoinClient;
  watchedScriptClient: WatchedScriptsService;
  relayTxids: Map<string, RelayTxIdBody>;
  // receiver -> bitcoin_address -> (txid, vout) -> Deposit
  depositIndex: Map<string, Map<string, Map<string, Deposit>>>;

  constructor(
    btcClient: RPCClient,
    cwBitcoinClient: CwBitcoinClient,
    db: DuckDbNode
  ) {
    this.btcClient = btcClient;
    this.cwBitcoinClient = cwBitcoinClient;
    this.watchedScriptClient = new WatchedScriptsService(
      db,
      this.cwBitcoinClient
    );
    WatchedScriptsService.instances = this.watchedScriptClient;
    this.relayTxids = new Map<string, RelayTxIdBody>();
    this.depositIndex = new Map<string, Map<string, Map<string, Deposit>>>();
  }

  async relay() {
    await Promise.all([
      this.relayHeader(),
      this.relayDeposit(),
      this.relayRecoveryDeposits(),
      this.relayCheckpoints(),
      this.relayCheckpointConf(),
    ]);
  }

  // [RELAY HEADER]
  async relayHeader() {
    console.log("Starting header relay...");
    let lastHash = null;

    while (true) {
      try {
        let [fullNodeHash, sideChainHash] = await Promise.all([
          this.btcClient.getbestblockhash(),
          this.cwBitcoinClient.sidechainBlockHash(),
        ]);

        if (fullNodeHash !== sideChainHash) {
          await this.relayHeaderBatch(fullNodeHash, sideChainHash);
          continue;
        }

        if (lastHash != fullNodeHash) {
          lastHash = fullNodeHash;
          const lastHashHeader: BlockHeader =
            await this.btcClient.getblockheader({
              blockhash: lastHash,
            });
          console.log(
            `Sidechain header state is up-to-date:\n\thash=${lastHashHeader.hash}\n\theight=${lastHashHeader.height}`
          );
        }
      } catch (err) {
        console.log(`[RELAY_HEADER] ${err?.message}`);
      }
    }
  }

  async relayHeaderBatch(fullNodeHash: string, sideChainHash: string) {
    let [fullNodeInfo, sideChainInfo]: [BlockHeader, BlockHeader] = (
      await retry(
        () =>
          this.btcClient.batch([
            {
              method: "getblockheader",
              params: [fullNodeHash],
            },
            {
              method: "getblockheader",
              params: [sideChainHash],
            },
          ]),
        10,
        RETRY_DELAY
      )
    ).map((item) => item.result);

    if (fullNodeInfo.height < sideChainInfo.height) {
      console.log!("Full node is still syncing with real running node!");
      return;
    }
    let startHeader = await this.commonAncestor(fullNodeHash, sideChainHash);
    let wrappedHeaders = await this.getHeaderBatch(startHeader.hash);

    console.log(
      `Relaying headers...\n\theight=${wrappedHeaders[0].height}\n\tbatches=${wrappedHeaders.length}`
    );

    await wrappedExecuteTransaction(async () => {
      const tx = await this.cwBitcoinClient.relayHeaders({
        headers: [...wrappedHeaders],
      });
      console.log(`Relayed headers with tx hash: ${tx.transactionHash}`);
    });

    let currentSidechainBlockHash =
      await this.cwBitcoinClient.sidechainBlockHash();
    if (currentSidechainBlockHash === fullNodeHash) {
      console.log("Relayed all headers");
    }
    return;
  }

  async getHeaderBatch(blockHash: string): Promise<WrappedHeader[]> {
    let cursorHeader: VerbosedBlockHeader = await retry(
      () =>
        this.btcClient.getblockheader({
          blockhash: blockHash,
          verbose: true,
        }),
      10,
      RETRY_DELAY
    );
    let wrappedHeaders = [];
    for (let i = 0; i < RELAY_HEADER_BATCH_SIZE; i++) {
      let nextHash = cursorHeader?.nextblockhash;

      if (nextHash !== undefined) {
        cursorHeader = await retry(
          () =>
            this.btcClient.getblockheader({
              blockhash: nextHash,
              verbose: true,
            }),
          10,
          RETRY_DELAY
        );
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

  async commonAncestor(leftHash: string, rightHash: string) {
    let [leftHeader, rightHeader]: [BlockHeader, BlockHeader] = (
      await retry(
        () =>
          this.btcClient.batch([
            {
              method: "getblockheader",
              params: [leftHash],
            },
            {
              method: "getblockheader",
              params: [rightHash],
            },
          ]),
        10,
        RETRY_DELAY
      )
    ).map((item) => item.result);

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
        leftHeader = await retry(
          () =>
            this.btcClient.getblockheader({
              blockhash: prev,
            }),
          10,
          RETRY_DELAY
        );
      } else {
        let prev = rightHeader.previousblockhash;
        rightHeader = await retry(
          () =>
            this.btcClient.getblockheader({
              blockhash: prev,
            }),
          10,
          RETRY_DELAY
        );
      }
    }

    return leftHeader;
  }

  // [RELAY_DEPOSIT]
  async relayDeposit() {
    console.log("Starting deposit relay...");
    let prevTip = null;
    while (true) {
      try {
        console.log("Scanning mempool for deposit transactions...");

        // Mempool handler
        await this.scanTxsFromMempools();

        // Block handler
        console.log("Scanning blocks for deposit transactions...");
        const tip = await this.cwBitcoinClient.sidechainBlockHash();

        if (prevTip === tip) {
          throw new Error(
            "Current tip block is scanned for relaying. Waiting for next header..."
          );
        }

        prevTip = prevTip || tip;
        let startHeight = (await this.commonAncestor(tip, prevTip)).height;
        let endHeader: BlockHeader = await this.btcClient.getblockheader({
          blockhash: tip,
          verbose: true,
        });
        let endHeight = endHeader.height;
        let numBlocks = Math.max(
          endHeight - startHeight,
          RELAY_DEPOSIT_BLOCKS_SIZE
        );

        await this.scanDeposits(numBlocks);
        prevTip = tip;

        console.log("Waiting some seconds for next scan...");
      } catch (err) {
        if (!err?.message.includes("Waiting for next header...")) {
          console.log(`[RELAY_DEPOSIT] ${err?.message}`);
        }
      }
      await setTimeout(ITERATION_DELAY);
    }
  }

  async scanTxsFromMempools() {
    try {
      let mempoolTxs = await this.btcClient.getrawmempool();
      let detailMempoolTxs: BitcoinTransaction[] = await retry(
        async () => {
          return (
            await this.btcClient.batch([
              ...mempoolTxs.map((txid: string) => ({
                method: "getrawtransaction",
                params: [txid, true],
              })),
            ])
          ).map((item) => item.result);
        },
        10,
        RETRY_DELAY
      );

      for (const tx of detailMempoolTxs) {
        let txid = tx.txid;
        if (this.relayTxids.get(txid)) continue;

        const outputs = tx.vout;

        for (let vout = 0; vout < outputs.length; vout++) {
          let output = outputs[vout];
          if (output.scriptPubKey.type != ScriptPubkeyType.WitnessScriptHash) {
            continue;
          }

          const address = decodeAddress(output);
          if (address !== output.scriptPubKey.address) continue;

          const script = await this.watchedScriptClient.getScript(
            output.scriptPubKey.hex
          );

          if (!script) continue;

          console.log(`Found pending deposit transaction ${txid}`);
          this.relayTxids.set(txid, {
            tx,
            script,
          });

          setNestedMap(
            this.depositIndex,
            [
              toReceiverAddr(convertSdkDestToWasmDest(script.dest)),
              address,
              getTxidKey(txid, vout),
            ],
            {
              txid,
              vout,
              height: undefined,
              amount: output.value,
            } as Deposit
          );
        }
      }
    } catch (err) {
      console.log(`[SCAN_TX_FROM_MEMPOOL] ${err?.message}`);
    }
  }

  async scanDeposits(numBlocks: number) {
    try {
      let tip = await this.cwBitcoinClient.sidechainBlockHash();
      let blocks = await this.lastNBlocks(numBlocks, tip);
      for (const block of blocks) {
        let txs = await this.filterDepositTxs(block.tx);
        for (const tx of txs) {
          try {
            await this.maybeRelayDeposit(tx, block.height, block.hash);
          } catch (err) {
            console.log(
              `[MAYBE_RELAY_DEPOSIT] ${err?.message} at tx ${tx.txid}`
            );
          }
        }
      }
    } catch (err) {
      console.log(`[SCAN_DEPOSITS] ${err?.message}`);
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

      const address = decodeAddress(output);
      if (address !== output.scriptPubKey.address) continue;

      const script = await this.watchedScriptClient.getScript(
        output.scriptPubKey.hex
      );

      if (!script) continue;

      const isExistOutpoint = await this.cwBitcoinClient.processedOutpoint({
        key: calculateOutpointKey(txid, i),
      });

      if (isExistOutpoint === true) {
        setNestedMap(
          this.depositIndex,
          [
            toReceiverAddr(convertSdkDestToWasmDest(script.dest)),
            address,
            getTxidKey(txid, i),
          ],
          undefined
        );
        continue;
      }

      setNestedMap(
        this.depositIndex,
        [
          toReceiverAddr(convertSdkDestToWasmDest(script.dest)),
          address,
          getTxidKey(txid, i),
        ],
        {
          txid,
          vout: i,
          height: blockHeight,
          amount: output.value,
        } as Deposit
      );

      const txProof = await this.btcClient.gettxoutproof({
        txids: [txid],
        blockhash: blockHash,
      });

      await wrappedExecuteTransaction(async () => {
        const tx = await this.cwBitcoinClient.relayDeposit({
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
        console.log(`Relayed deposit tx ${txid} at tx ${tx.transactionHash}`);
      });
    }
  }

  // [RELAY RECOVERY DEPOSITS]
  async relayRecoveryDeposits() {
    console.log("Starting recovery deposit relay...");
    const relayed = {};
    while (true) {
      try {
        const txs = await this.cwBitcoinClient.signedRecoveryTxs();
        for (const recoveryTx of txs) {
          if (relayed[recoveryTx]) continue;

          const tx = await this.btcClient.sendrawtransaction({
            hexstring: Buffer.from(recoveryTx, "base64").toString("hex"),
          });
          relayed[recoveryTx] = true;
          console.log(`Relayed recovery tx ${tx}`);
        }
      } catch (err) {
        console.log(`[RELAY_RECOVERY_DEPOSIT] ${err?.message}`);
      }
      await setTimeout(ITERATION_DELAY);
    }
  }

  // [RELAY CHECKPOINT]
  async relayCheckpoints() {
    console.log("Starting checkpoint relay...");
    const relayed = {};
    while (true) {
      try {
        const checkpoints = await this.cwBitcoinClient.completedCheckpointTxs({
          limit: 1100,
        });
        for (const checkpoint of checkpoints) {
          if (relayed[checkpoint]) continue;

          try {
            const tx = await this.btcClient.sendrawtransaction({
              hexstring: Buffer.from(checkpoint, "base64").toString("hex"),
            });
            relayed[checkpoint] = true;
            console.log(`Relayed checkpoint tx ${tx}`);
          } catch (err) {}
        }
      } catch (err) {
        console.log(`[RELAY_CHECKPOINT] ${err?.message}`);
      }
      await setTimeout(ITERATION_DELAY);
    }
  }

  // [RELAY CHECKPOINT CONFIRM]
  async relayCheckpointConf() {
    let relayed = {};
    console.log("Starting checkpoint confirm relay...");
    while (true) {
      try {
        let [confirmedIndex, unconfirmedIndex, lastCompletedIndex] =
          await Promise.all([
            this.cwBitcoinClient.confirmedIndex(),
            this.cwBitcoinClient.unhandledConfirmedIndex(),
            this.cwBitcoinClient.completedIndex(),
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
            let rawTx = await this.cwBitcoinClient.checkpointTx({
              index: unconfIndex,
            });
            return fromBinaryTransaction(Buffer.from(rawTx, "base64"));
          })(),
          (async () => {
            const blockHash = await this.cwBitcoinClient.sidechainBlockHash();
            const blockHeader = await this.btcClient.getblockheader({
              blockhash: blockHash,
            });
            return blockHeader.height as number;
          })(),
          (async () => {
            const config = await this.cwBitcoinClient.bitcoinConfig();
            return config.min_confirmations;
          })(),
        ]);
        let txid = getBitcoinTransactionTxid(tx);

        if (relayed[txid]) {
          throw new Error(
            `Checkpoint confirm with tx ${txid} is already relayed`
          );
        }

        let maybeConf = await this.scanForTxid(txid, 100, 200);

        if (maybeConf !== null) {
          let [height, blockHash] = maybeConf;
          if (height > btcHeight - minConfs) {
            console.log(
              `Waiting for more confirmations to relay checkpoint confirm with tx ${txid} ...`
            );
            continue;
          }

          let txProof = await this.btcClient.gettxoutproof({
            txids: [txid],
            blockhash: blockHash,
          });
          await wrappedExecuteTransaction(async () => {
            const tx = await this.cwBitcoinClient.relayCheckpoint({
              btcHeight: height,
              cpIndex: unconfIndex,
              btcProof: Buffer.from(
                toBinaryPartialMerkleTree(
                  fromBinaryMerkleBlock(Buffer.from(txProof, "hex")).txn
                )
              ).toString("base64"),
            });
            console.log(
              `Relayed checkpoint confirmation with tx ${txid} at tx ${tx.transactionHash}`
            );
          });
          relayed[txid] = true;
        }
      } catch (err) {
        if (
          !err?.message.includes("Waiting for next scan...") &&
          !err?.message.includes("No completed checkpoints yet")
        ) {
          console.log(`[RELAY_CHECKPOINT_CONF] ${err?.message}`);
        }
      }
      await setTimeout(ITERATION_DELAY);
    }
  }

  async scanForTxid(
    txid: string,
    numBlocks: number,
    scanBlocks: number
  ): Promise<[number, string] | null> {
    let tip = await this.cwBitcoinClient.sidechainBlockHash();
    let baseHeader = await this.btcClient.getblockheader({
      blockhash: tip,
    });
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
      baseHeight = (
        await this.btcClient.getblockheader({
          blockhash: tip,
        })
      ).height;
    }

    return null;
  }

  // [QUERY FUNCTIONS]
  async getPendingDeposits(receiver: string): Promise<DepositInfo[]> {
    const currentSidechainBlockHash =
      await this.cwBitcoinClient.sidechainBlockHash();
    const blockHeader: BlockHeader = await this.btcClient.getblockheader({
      blockhash: currentSidechainBlockHash,
    });
    const currentBtcHeight = blockHeader.height;

    const addressMap = this.depositIndex.get(receiver);
    if (!addressMap) return [];

    const deposits = Array.from(addressMap.values()).flatMap(
      (addressMapValue) =>
        Array.from(addressMapValue.values())
          .filter((deposit) => deposit) // Filter out falsy values
          .map((deposit) => {
            const confirmations = deposit.height
              ? currentBtcHeight - deposit.height + 1
              : 0;
            return {
              deposit,
              confirmations,
            };
          })
    );

    return deposits;
  }

  async generateDepositAddress(dest: Dest): Promise<string> {
    const checkpoint = await this.cwBitcoinClient.buildingCheckpoint();
    const checkpointConfig = await this.cwBitcoinClient.checkpointConfig();
    const sigset = checkpoint.sigset;
    const encodedDest = commitmentBytes(convertSdkDestToWasmDest(dest));
    const depositScript = redeemScript(
      sigset,
      Buffer.from(encodedDest),
      checkpointConfig.sigset_threshold
    );
    let wsh = btc.payments.p2wsh({
      redeem: { output: depositScript },
      network: getCurrentNetwork(),
    });
    let address = wsh.address;

    await this.watchedScriptClient.insertScript({
      address,
      script: toScriptPubKeyP2WSH(depositScript).toString("hex"),
      dest,
      sigsetIndex: checkpoint.sigset.index,
      sigsetCreateTime: checkpoint.sigset.create_time,
    });

    return address;
  }
}

export default RelayerService;
