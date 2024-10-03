import { RPCClient } from "rpc-bitcoin";

const main = async () => {
  const btcClient = new RPCClient({
    port: 8332,
    host: "http://127.0.0.1",
    user: "satoshi",
    pass: "nakamoto",
  });

  let mempoolTxs = await btcClient.getrawmempool({
    verbose: true,
  });
  console.log(mempoolTxs);
};

main();
