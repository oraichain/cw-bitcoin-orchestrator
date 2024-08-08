import { RPCClient } from "rpc-bitcoin";
import dotenv from "dotenv";
dotenv.config();

const main = async () => {
  const url = "http://127.0.0.1";
  const user = "satoshi";
  const pass = "nakamoto";
  const port = 8332;
  const timeout = 10000;
  const client = new RPCClient({ url, port, timeout, user, pass });

  const response = await client.batch([
    { method: "getbestblockhash", id: 1 },
    { method: "help", params: { command: "help" }, id: "custom-id" },
    { method: "getzmqnotifications", params: {}, id: 2 },
  ]);

  console.log({ response });
};

main();
