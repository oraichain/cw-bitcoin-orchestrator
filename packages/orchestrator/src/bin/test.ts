import env from "../configs/env";
import { DuckDbNode } from "../services/db";
import { TableName } from "../utils/db";

const main = async () => {
  console.log("Initilizing DuckDB...");
  await DuckDbNode.create(env.duckdb.name);
  console.log("Initilized DuckDB!");
  console.log("Creating tables in DuckDB!");
  await DuckDbNode.instances.createTable();
  console.log("Tables are created in DuckDB!");

  let db = DuckDbNode.instances;

  const data = await db.select(TableName.RelayedSet, {});

  console.log(data);
};

main();
