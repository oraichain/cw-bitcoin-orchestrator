import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { RPCClient } from "rpc-bitcoin";
import { BlockHeader } from "src/@types";

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
