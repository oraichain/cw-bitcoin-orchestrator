import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import * as crypto from "crypto";
import { RPCClient } from "rpc-bitcoin";
import env from "./configs/env";
import { WasmLocalConfig } from "./configs/networks";
import { initSignerClient } from "./utils/cosmos";

// Function to create a buffer from a single byte
function createSeed(num: number): Buffer {
  return crypto
    .createHash("sha256")
    .update(Buffer.from([num]))
    .digest();
}

// Set up testnet for testing
const main = async () => {
  const { sender, client } = await initSignerClient(WasmLocalConfig);
  const cwBitcoinClient = new CwBitcoinClient(
    client,
    sender,
    env.cosmos.cwBitcoin
  );
  const btcClient = new RPCClient({
    port: env.bitcoin.port,
    host: env.bitcoin.host,
    user: env.bitcoin.username,
    pass: env.bitcoin.password,
  });

  const proof = await btcClient.gettxoutproof({
    txids: ["9b8bbd7b21a00a3b5aa039b8f614f6a13a1bb62ded48e6f59b625ffda2e031ed"],
    blockhash:
      "0000000000003263c0707b645f8647346f0b8e2c8243c9cb1c85aa764b84e552",
  });
  console.log(proof);

  return;

  // Create xprivs (extended private keys)
  // const hdkey = HDKey.fromMasterSeed(createSeed(0));
  // Create xpubs (extended public keys)
  // const xpub = hdkey.publicExtendedKey;
  // const xpriv = hdkey.privateExtendedKey;

  // console.log({
  //   xpub,
  //   xpriv,
  // });

  // const array = new Uint8Array(32);
  // const tx = await cwBitcoinClient.addValidators({
  //   addrs: [sender],
  //   consensusKeys: [Array.from(array.fill(0))],
  //   votingPowers: [10],
  // });
  // console.log(tx.transactionHash);
  // const tx = await cwBitcoinClient.setSignatoryKey({
  //   xpub: Buffer.from(bs58check.decode(xpub)).toString("base64"),
  // });
  // console.log(tx.transactionHash);

  // const tx = await cwBitcoinClient.updateHeaderConfig({
  //   config: {
  //     max_length: 24192,
  //     max_time_increase: 2 * 60 * 60,
  //     trusted_height: 2574432,
  //     retarget_interval: 2016,
  //     target_spacing: 10 * 60,
  //     target_timespan: 2016 * (10 * 60),
  //     max_target: 0x1d00ffff,
  //     retargeting: true,
  //     min_difficulty_blocks: true,
  //     trusted_header: toBinaryBlockHeader({
  //       version: 536870912,
  //       prev_blockhash:
  //         "000000000000001f6d8dc4976552a596eff2eb0df15b0d9ee61a55091a2050c2",
  //       merkle_root:
  //         "03a2f5712c4c44daafa6475007de611b91be9738fc005788b7072153d651f36f",
  //       time: 1705736135,
  //       bits: 422015362,
  //       nonce: 3433041756,
  //     }),
  //   },
  // });
  // console.log(tx.transactionHash);
};

main();
