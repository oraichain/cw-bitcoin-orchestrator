import { Dest } from "@oraichain/bitcoin-bridge-wasm-sdk";
import { DuckDbNode } from "../src/services/db";
import { TableName } from "../src/utils/db";

const seedsData = [
  {
    script: "123",
    address: "a",
    dest: JSON.stringify({
      Address: "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd",
    } as Dest),
    sigsetIndex: 0,
    sigsetCreateTime: 10000000,
  },
  {
    script: "345",
    address: "b",
    dest: JSON.stringify({
      Ibc: {
        memo: "",
        source_channel: "channel-0",
        source_port: "port-0",
        timeout_timestamp: 12000000,
      },
    } as Dest),
    sigsetIndex: 1,
    sigsetCreateTime: 11000000,
  },
];

describe("Testing DuckDB WatchedScripts", () => {
  beforeEach(async () => {
    const db = await DuckDbNode.create();
    if (db) {
      await db.createTable();
      for (const seed of seedsData) {
        await db.insertData(seed, TableName.WatchedScripts);
      }
    }
  });

  afterEach(async () => {
    await DuckDbNode.instances.dropTable(TableName.WatchedScripts);
  });

  it("Test query from address", async () => {
    const data: any = await Promise.all([
      DuckDbNode.instances.select(TableName.WatchedScripts, {
        where: {
          address: "a",
        },
      }),
      DuckDbNode.instances.select(TableName.WatchedScripts, {
        where: {
          address: "b",
        },
      }),
    ]);
    expect(data[0][0]?.address).toBe("a");
    expect(data[1][0]?.address).toBe("b");
  });
});
