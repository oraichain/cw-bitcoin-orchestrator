import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { WrappedHeader } from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import {
  commitmentBytes,
  decodeRawTx,
  Deposit,
  DepositInfo,
  fromBinaryMerkleBlock,
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
  RELAY_DEPOSIT_BLOCKS_SIZE,
  RELAY_DEPOSIT_ITERATION_DELAY,
  RELAY_HEADER_BATCH_SIZE,
  SCAN_MEMPOOL_CHUNK_DELAY,
  SCAN_MEMPOOL_CHUNK_SIZE,
} from "../../constants";
import {
  calculateOutpointKey,
  decodeAddress,
  redeemScript,
  ScriptPubkeyType,
  toScriptPubKeyP2WSH,
} from "../../utils/bitcoin";
import { wrappedExecuteTransaction } from "../../utils/cosmos";
import { convertSdkDestToWasmDest } from "../../utils/dest";
import { setNestedMap } from "../../utils/map";
import { DuckDbNode } from "../db";
import WatchedScriptsService, {
  WatchedScriptsInterface,
} from "../watched_scripts";

interface RelayTxIdBody {
  tx: BitcoinTransaction;
  script: WatchedScriptsInterface;
}

class RelayerService {
  static instances: RelayerService;
  btcClient: RPCClient;
  cwBitcoinClient: CwBitcoinClient;
  watchedScriptClient: WatchedScriptsService;
  relayTxids: Map<string, RelayTxIdBody>;
  // receiver -> bitcoin_address -> (txid, vout) -> Deposit
  depositIndex: Map<string, Map<string, Map<[string, number], Deposit>>>;

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
    this.depositIndex = new Map<
      string,
      Map<string, Map<[string, number], Deposit>>
    >();
  }

  // [RELAY HEADER]
  async relayHeader() {
    let lastHash = null;

    while (true) {
      let fullNodeHash = await this.btcClient.getbestblockhash();
      let sideChainHash = await this.cwBitcoinClient.sidechainBlockHash();

      if (fullNodeHash !== sideChainHash) {
        try {
          await this.relayHeaderBatch(fullNodeHash, sideChainHash);
        } catch (err) {
          console.log(err);
        }
        continue;
      }

      if (lastHash != fullNodeHash) {
        lastHash = fullNodeHash;
        const lastHashHeader: BlockHeader = await this.btcClient.getblockheader(
          {
            blockhash: lastHash,
          }
        );
        console.log(
          `Sidechain header state is up-to-date:\n\thash=${lastHashHeader.hash}\n\theight=${lastHashHeader.height}`
        );
      }
    }
  }

  async relayHeaderBatch(fullNodeHash: string, sideChainHash: string) {
    let fullNodeInfo: BlockHeader = await this.btcClient.getblockheader({
      blockhash: fullNodeHash,
    });
    let sideChainInfo: BlockHeader = await this.btcClient.getblockheader({
      blockhash: sideChainHash,
    });

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
    let cursorHeader: VerbosedBlockHeader = await this.btcClient.getblockheader(
      {
        blockhash: blockHash,
        verbose: true,
      }
    );
    let wrappedHeaders = [];
    for (let i = 0; i < RELAY_HEADER_BATCH_SIZE; i++) {
      let nextHash = cursorHeader?.nextblockhash;

      if (nextHash !== undefined) {
        cursorHeader = await this.btcClient.getblockheader({
          blockhash: nextHash,
          verbose: true,
        });
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
    let leftHeader: BlockHeader = await this.btcClient.getblockheader({
      blockhash: leftHash,
    });
    let rightHeader: BlockHeader = await this.btcClient.getblockheader({
      blockhash: rightHash,
    });

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
        leftHeader = await this.btcClient.getblockheader({
          blockhash: prev,
        });
      } else {
        let prev = rightHeader.previousblockhash;
        rightHeader = await this.btcClient.getblockheader({
          blockhash: prev,
        });
      }
    }

    return leftHeader;
  }

  // [RELAY_DEPOSIT]
  async relayDeposit() {
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
          await setTimeout(RELAY_DEPOSIT_ITERATION_DELAY);
          continue;
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
        await setTimeout(RELAY_DEPOSIT_ITERATION_DELAY);
      } catch (err) {
        console.log(err?.message);
      }
    }
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

  async scanDeposits(numBlocks: number) {
    try {
      let tip = await this.cwBitcoinClient.sidechainBlockHash();
      let blocks = await this.lastNBlocks(numBlocks, tip);
      for (const block of blocks) {
        let txs = block.tx;
        for (const tx of txs) {
          await this.maybeRelayDeposit(tx, block.hash, block.height);
        }
      }
    } catch (err) {
      console.log(err?.message);
    }
  }

  async maybeRelayDeposit(
    tx: BitcoinTransaction,
    blockHash: string,
    blockHeight: number
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

      if (isExistOutpoint) {
        this.depositIndex.delete(
          toReceiverAddr(convertSdkDestToWasmDest(script.dest))
        );
        continue;
      }

      setNestedMap(
        this.depositIndex,
        [
          toReceiverAddr(convertSdkDestToWasmDest(script.dest)),
          address,
          [txid, i],
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

      try {
        await wrappedExecuteTransaction(async () => {
          const tx = await this.cwBitcoinClient.relayDeposit({
            btcHeight: blockHeight,
            btcTx: toBinaryTransaction(decodeRawTx(rawTx)),
            btcProof: toBinaryPartialMerkleTree(
              fromBinaryMerkleBlock(
                Buffer.from(txProof, "hex").toString("base64")
              ).txn
            ),
            btcVout: i,
            dest: script.dest,
            sigsetIndex: Number(script.sigsetIndex),
          });
          console.log(`Relayed deposit tx ${txid} at tx ${tx.transactionHash}`);
        });
      } catch (err) {
        console.error(err);
      }
    }
  }

  async scanTxsFromMempools() {
    try {
      let mempoolTxs = await this.btcClient.getrawmempool();
      let idx = 0;
      for (const txid of mempoolTxs) {
        if (this.relayTxids.get(txid)) continue;

        let tx: BitcoinTransaction = await this.btcClient.getrawtransaction({
          txid: txid,
          verbose: true,
        });
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
              [txid, vout],
            ],
            {
              txid,
              vout,
              height: undefined,
              amount: output.value,
            } as Deposit
          );
        }
        idx++;

        if (idx == SCAN_MEMPOOL_CHUNK_SIZE) {
          await setTimeout(SCAN_MEMPOOL_CHUNK_DELAY);
          idx = 0;
        }
      }
    } catch (err) {
      console.log(err?.message);
    }
  }

  // [QUERY FUNCTIONS]
  async getPendingDeposits(receiver: string): Promise<DepositInfo[]> {
    const currentSidechainBlockHash =
      await this.cwBitcoinClient.sidechainBlockHash();
    const blockHeader: BlockHeader = await this.btcClient.getblockheader({
      blockhash: currentSidechainBlockHash,
    });
    const currentBtcHeight = blockHeader.height;

    let deposits: DepositInfo[] = [];
    const addressMap = this.depositIndex.get(receiver);
    if (addressMap) {
      for (const addressMapValue of addressMap.values()) {
        for (const deposit of addressMapValue.values()) {
          const confirmations = deposit.height
            ? currentBtcHeight - deposit.height + 1
            : 0;
          deposits = [
            ...deposits,
            {
              deposit,
              confirmations,
            },
          ];
        }
      }
    }

    return deposits;
  }

  async getDepositAddress(receiver: string): Promise<string> {
    const checkpoint = await this.cwBitcoinClient.buildingCheckpoint();
    const checkpointConfig = await this.cwBitcoinClient.checkpointConfig();
    const sigset = checkpoint.sigset;
    const encodedDest = commitmentBytes({ Address: receiver });
    const depositScript = redeemScript(
      sigset,
      Buffer.from(encodedDest),
      checkpointConfig.sigset_threshold
    );
    let wsh = btc.payments.p2wsh({
      redeem: { output: depositScript },
      network: btc.networks.testnet,
    });
    let address = wsh.address;

    await this.watchedScriptClient.insertScript({
      address,
      script: toScriptPubKeyP2WSH(depositScript).toString("hex"),
      dest: { address: receiver },
      sigsetIndex: checkpoint.sigset.index,
      sigsetCreateTime: checkpoint.sigset.create_time,
    });

    return address;
  }
}

export default RelayerService;
