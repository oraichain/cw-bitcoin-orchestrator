import { DuckDbNode } from "../src/services/db";
import { TableName } from "../src/utils/db";

const seedsData = [
  {
    address: "a",
  },
  {
    address: "b",
  },
];

describe("Testing DuckDB WatchedScripts", () => {
  beforeEach(async () => {
    const db = await DuckDbNode.create(":memory:");
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
      DuckDbNode.instances.update(
        TableName.WatchedScripts,
        {
          address: "c",
        },
        {
          where: {
            address: "a",
          },
        }
      ),
      DuckDbNode.instances.select(TableName.WatchedScripts, {
        where: {
          address: "c",
        },
      }),
      DuckDbNode.instances.select(TableName.WatchedScripts, {
        where: {
          address: "b",
        },
      }),
    ]);
    expect(data[1][0]?.address).toBe("c");
  });
});
