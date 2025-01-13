import { RPCClient } from "@oraichain/rpc-bitcoin";
import { VerbosedBlockHeader } from "src/@types";
import { logger } from "../../configs/logger";
import { DuckDbNode } from "../db";

export interface BlockHeaderInterface {
  hash: string;
  data: string;
}

class BlockHeaderService {
  logger: any;

  constructor(protected btcClient: RPCClient, protected db: DuckDbNode) {
    this.logger = logger("BlockHeaderService");
  }

  async getBlockHeader(blockhash: string): Promise<VerbosedBlockHeader | null> {
    const blockHeaderData: VerbosedBlockHeader =
      await this.btcClient.getblockheader({
        blockhash,
        verbose: true,
      });
    return blockHeaderData;
  }
}

export default BlockHeaderService;
