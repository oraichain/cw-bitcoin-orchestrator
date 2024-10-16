import { toObject } from '@oraichain/oraidex-common';
import { Connection, Database } from 'duckdb-async';
import fs from 'fs';
import _ from 'lodash';
import os from 'os';
import path from 'path';
import env from '../../configs/env';
import { TableName } from '../../utils/db';

export const sqlCommands = {
  create: {
    [TableName.WatchedScripts]: `CREATE TABLE IF NOT EXISTS ${TableName.WatchedScripts}
      (
        script VARCHAR PRIMARY KEY,
        address VARCHAR,
        dest VARCHAR,
        sigsetIndex BIGINT,
        sigsetCreateTime BIGINT,
      )
      `,
    [TableName.DepositIndex]: `CREATE TABLE IF NOT EXISTS ${TableName.DepositIndex}
      (
        receiver VARCHAR,
        bitcoinAddress VARCHAR,
        txid VARCHAR,
        vout INTEGER,
        deposit VARCHAR,
        PRIMARY KEY (receiver, bitcoinAddress, txid, vout)
      )
      `,
    [TableName.RelayedSet]: `CREATE TABLE IF NOT EXISTS ${TableName.RelayedSet}
      (
        data VARCHAR PRIMARY KEY,
      )
      `,
    [TableName.BlockHeader]: `CREATE TABLE IF NOT EXISTS ${TableName.BlockHeader}
      (
        hash VARCHAR PRIMARY KEY,
        data VARCHAR,
      )
      `
  }
};

export abstract class DuckDB {
  abstract createTable(): Promise<void>;
  abstract dropTable(tableName: TableName): Promise<void>;
  abstract select(tableName: TableName, options: OptionInterface): Promise<any>;
  abstract insert(tableName: TableName, data: Object): Promise<void>;
  abstract delete(tableName: TableName, options: OptionInterface): Promise<any>;
  abstract update(tableName: TableName, overrideData: Object, options: OptionInterface): Promise<void>;
}

export interface PaginationInterface {
  limit?: number;
  offset?: number;
}

export interface OptionInterface {
  where?: Object;
  attributes?: string[];
  pagination?: PaginationInterface;
}

export class DuckDbNode extends DuckDB {
  static instances: DuckDbNode;
  protected constructor(public readonly conn: Connection) {
    super();
  }

  async select(tableName: TableName, options: OptionInterface): Promise<any> {
    const defaultOptions = {
      where: {},
      attributes: [],
      pagination: {}
    };
    const [query, values] = this.selectClause(tableName, {
      ...defaultOptions,
      ...options
    });
    const result = await this.conn.all(query, ...values);
    return result;
  }

  async insert(tableName: TableName, data: Object): Promise<void> {
    const [query, values] = this.insertClause(tableName, data);
    await this.conn.run(query, ...values);
  }

  async delete(tableName: TableName, options: OptionInterface): Promise<void> {
    const [query, values] = this.deleteClause(tableName, options);
    await this.conn.run(query, ...values);
  }

  async update(tableName: TableName, overrideData: Object, options: OptionInterface): Promise<void> {
    const [query, values] = this.updateClause(tableName, overrideData, options);
    await this.conn.run(query, ...values);
  }

  static async create(dbName?: string): Promise<DuckDbNode> {
    const homeDir = os.homedir();
    const relayerDirPath = path.join(homeDir, env.server.storageDirName);

    if (!fs.existsSync(relayerDirPath)) {
      fs.mkdirSync(relayerDirPath, { recursive: true });
    }

    const dbPath = dbName ? `${relayerDirPath}/${dbName}` : ':memory:';
    if (!DuckDbNode.instances) {
      let db = await Database.create(dbPath);
      await db.close(); // close to flush WAL file
      db = await Database.create(dbPath);
      const conn = await db.connect();
      DuckDbNode.instances = new DuckDbNode(conn);
    }

    return DuckDbNode.instances;
  }

  async createTable() {
    for (const createCommand of Object.values(sqlCommands.create)) {
      await this.conn.exec(createCommand);
    }
  }

  // TODO: use typescript here instead of any
  async insertData(data: any, tableName: string) {
    const tableFile = `${tableName}.json`;
    // the file written out is temporary only. Will be deleted after insertion
    await fs.promises.writeFile(tableFile, JSON.stringify(toObject(data)));
    const query = `INSERT INTO ${tableName} SELECT * FROM read_json_auto(?)`;
    await this.conn.run(query, tableFile);
    await fs.promises.unlink(tableFile);
  }

  async dropTable(tableName: string) {
    const query = `DROP TABLE ${tableName}`;
    await this.conn.run(query);
  }

  // ORM BASIC
  selectClause(
    tableName: string,
    options: OptionInterface = {
      where: {},
      attributes: [],
      pagination: {}
    }
  ): [string, any[]] {
    const attributes = options.attributes;
    const whereKeys = Object.keys(options.where);
    const whereValues = Object.values(options.where);
    const whereClauses = whereKeys.length > 0 ? `WHERE ${whereKeys.map((item) => `${item} = ?`).join(' AND ')}` : '';
    const paginationKeys = Object.keys(options.pagination);
    const paginationValues = Object.values(options.pagination);
    const paginationClause = paginationKeys.length > 0 ? `${options.pagination?.limit ? `LIMIT ?` : ''} ${options.pagination?.offset ? 'OFFSET ?' : ''}` : '';

    const query = _.trim(`SELECT ${attributes.length > 0 ? attributes.join(', ') : '*'} FROM ${tableName} ${whereClauses} ${paginationClause}`);

    return [query, [...whereValues, ...paginationValues]];
  }

  insertClause(tableName: string, data: Object): [string, any[]] {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const query = `INSERT OR IGNORE INTO ${tableName} (${keys.join(', ')}) VALUES (${keys.map((_) => '?').join(', ')})`;
    return [_.trim(query), values];
  }

  deleteClause(tableName: string, options: OptionInterface): [string, any[]] {
    const whereKeys = Object.keys(options.where);
    const whereValues = Object.values(options.where);
    const whereClauses = whereKeys.length > 0 ? `WHERE ${whereKeys.map((item) => `${item} = ?`).join(' AND ')}` : '';
    const query = _.trim(`DELETE FROM ${tableName} ${whereClauses}`);
    return [query, whereValues];
  }

  updateClause(tableName: TableName, overrideData: Object, options: OptionInterface): [string, any[]] {
    const overrideDataKeys = Object.keys(overrideData);
    const overrideDataValues = Object.values(overrideData);
    const setDataClause = `SET ${overrideDataKeys.map((item) => `${item} = ?`).join(', ')}`;
    const whereKeys = Object.keys(options.where);
    const whereValues = Object.values(options.where);
    const whereClauses = whereKeys.length > 0 ? `WHERE ${whereKeys.map((item) => `${item} = ?`).join(' AND ')}` : '';

    const query = _.trim(`UPDATE ${tableName} ${setDataClause} ${whereClauses}`);

    return [query, [...overrideDataValues, ...whereValues]];
  }
}
