import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { WrappedHeader } from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import { newWrappedHeader } from "@oraichain/bitcoin-bridge-wasm-sdk";
import { RPCClient } from "rpc-bitcoin";
import { BlockHeader, VerbosedBlockHeader } from "../../@types";
import { RELAY_HEADER_BATCH_SIZE } from "../../constants";

class RelayerService {
  btcClient: RPCClient;
  cwBitcoinClient: CwBitcoinClient;

  constructor(btcClient: RPCClient, cwBitcoinClient: CwBitcoinClient) {
    this.btcClient = btcClient;
    this.cwBitcoinClient = cwBitcoinClient;
  }

  async relayHeader() {
    let fullNodeHash = await this.btcClient.getbestblockhash();
    let sideChainHash = await this.cwBitcoinClient.sidechainBlockHash();
    console.log({ fullNodeHash }, { sideChainHash });

    if (fullNodeHash !== sideChainHash) {
      this.relayHeaderBatch(fullNodeHash, sideChainHash);
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
    console.log({ startHeader });
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
}

export default RelayerService;
