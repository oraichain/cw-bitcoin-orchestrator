import { RPCClient } from "rpc-bitcoin";

describe("Test bitcoin integration", () => {
  it("Testing integration", async () => {
    const btcClient = new RPCClient({
      port: 18443,
      host: "http://127.0.0.1:18443",
      user: "satoshi",
      pass: "nakamoto",
    });
    console.log(await btcClient.getblockchaininfo());
  });
});
