import { Logger } from "winston";
import { logger } from "../../configs/logger";
import { TableName } from "../../utils/db";
import { DuckDbNode } from "../db";

class RelayedSetService {
  logger: Logger;
  constructor(protected db: DuckDbNode) {
    this.db = db;
    this.logger = logger("RelayedSetService");
  }

  async insert(data: string) {
    await this.db.insert(TableName.RelayedSet, {
      data,
    });
  }

  async exist(data: string): Promise<boolean> {
    const result = await this.db.select(TableName.RelayedSet, {
      where: { data },
    });
    return result.length > 0;
  }
}

export default RelayedSetService;
