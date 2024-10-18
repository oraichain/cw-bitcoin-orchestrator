import { RPCClient } from "@oraichain/rpc-bitcoin";
const main = async () => {
  const btcClient = new RPCClient({
    host: "http://127.0.0.1",
    port: 18332,
    user: "satoshi",
    pass: "nakamoto",
  });

  const block = await btcClient.getblockheader({
    blockhash:
      "0000000004f2d17606dbfa138672dd8a32fe0d0f10cc207400f0bdb993e9d77c",
    verbose: true,
  });
  let { tx, ...data } = block;
  console.log(data);
};

main();
