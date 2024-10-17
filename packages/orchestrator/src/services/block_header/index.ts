import { RPCClient } from '@oraichain/rpc-bitcoin';
import { VerbosedBlockHeader } from 'src/@types';
import { Logger } from 'winston';
import { logger } from '../../configs/logger';
import { TableName } from '../../utils/db';
import { DuckDbNode } from '../db';

export interface BlockHeaderInterface {
  hash: string;
  data: string;
}

class BlockHeaderService {
  logger: Logger;

  constructor(protected btcClient: RPCClient, protected db: DuckDbNode) {
    this.logger = logger('BlockHeaderService');
  }

  async insert(blockhash: string): Promise<VerbosedBlockHeader> {
    try {
      const blockHeaderData: VerbosedBlockHeader = await this.btcClient.getblockheader({
        blockhash,
        verbose: true
      });
      if (blockHeaderData !== null) {
        await this.db.insert(TableName.BlockHeader, {
          hash: blockhash,
          data: JSON.stringify(blockHeaderData)
        });
        this.logger.info(`Inserted new block header with hash ${blockhash}`);
      }
      return blockHeaderData;
    } catch (err) {
      this.logger.error(`Error inserting block header with hash ${blockhash}`, err);
      throw err;
    }
  }

  async getBlockHeader(blockhash: string): Promise<VerbosedBlockHeader | null> {
    const data: BlockHeaderInterface[] = await this.db.select(TableName.BlockHeader, {
      where: { hash: blockhash }
    });
    if (data.length === 0) {
      return await this.insert(blockhash);
    }
    return JSON.parse(data[0].data) as VerbosedBlockHeader;
  }
}

export default BlockHeaderService;
