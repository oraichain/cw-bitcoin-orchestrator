import { RPCClient } from "rpc-bitcoin";
import env from "./configs/env";

const main = async () => {
  const client = new RPCClient({
    port: env.bitcoin.port,
    host: env.bitcoin.host,
    user: env.bitcoin.username,
    pass: env.bitcoin.password,
  });

  const response = await client.batch([{ method: "getbestblockhash", id: 1 }]);
  console.log({ response });
};

main();
