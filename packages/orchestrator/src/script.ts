import { CwBitcoinClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import BIP32Factory from "bip32";
import * as btc from "bitcoinjs-lib";
import * as crypto from "crypto";
import { RPCClient } from "rpc-bitcoin";
import * as ecc from "tiny-secp256k1";
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
  const { rpcEndpoint, prefix, gasPrice } = WasmLocalConfig;
  const { sender, client } = await initSignerClient(
    rpcEndpoint,
    prefix,
    gasPrice
  );
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

  const blockchainInfo = await btcClient.getblockchaininfo();
  const btcHeight = blockchainInfo.blocks;

  const tx = await cwBitcoinClient.updateConfig({
    tokenFee: {
      nominator: 1,
      denominator: 1000,
    },
  });
  console.log(tx.transactionHash);

  // console.log(
  //   await btcClient.batch([
  //     {
  //       method: "gettxoutproof",
  //       params: [
  //         ["dee372a44c2e37f26a960135ca7ca0ec7c0955ba45675045f6baaf482fe56c5c"],
  //         "000000000000000431bbd2b25dc902e35b4d4784bc613b9fe1375a06e2610da9",
  //       ],
  //     },
  //   ])
  // );

  // console.log(
  //   await cwBitcoinClient.signatoryKey({
  //     addr: "orai1tuf6xqfffyxtye68wasrh9vdrad3nzh6exum6g",
  //   })
  // );

  // console.log(sender);

  // register denom
  // const txRd = await cwBitcoinClient.registerDenom(
  //   {
  //     subdenom: "obtc",
  //     metadata: null,
  //   },
  //   "auto",
  //   "",
  //   [coin(10000000, "orai")]
  // );
  // console.log("Register denom:", txRd.transactionHash);

  // Create xprivs (extended private keys)
  // const hdkey = HDKey.fromMasterSeed(createSeed(0));
  // Create xpubs (extended public keys)
  // const xpub = hdkey.publicExtendedKey;
  // const xpriv = hdkey.privateExtendedKey;

  // console.log({
  //   xpub,
  //   xpriv,
  // });

  // const signTxs = await cwBitcoinClient.signingTxsAtCheckpointIndex({
  //   checkpointIndex: 0,
  //   xpub: encodeXpub({ key: xpub }),
  // });
  const bip32 = BIP32Factory(ecc);
  // const seed = crypto.randomBytes(32);
  // console.log({ seed });
  // const node = bip32.fromSeed(seed, btc.networks.testnet);
  const node = bip32.fromBase58(
    "tprv8ZgxMBicQKsPdhNhSUGBbeSckFPQpAdPdZTPQ2JsFZwvQBiT7hwcUeJCFpfPHP9h3hVdABAN2p64eF8qthSqKrkqB4EQJ2vkSpWWujmQEbU",
    btc.networks.testnet
  );
  // get extended pubkey here
  const xpriv = node.toBase58();
  const xpub = node.neutered().toBase58();

  // let signTxs = await cwBitcoinClient.signingTxsAtCheckpointIndex({
  //   xpub: encodeXpub({ key: xpub }),
  //   checkpointIndex: 6,
  // });
  // let sigs = [];
  // for (const signTx of signTxs) {
  //   const [msg, sigsetIndex] = signTx;
  //   const node = bip32.fromBase58(xpriv, btc.networks.testnet);
  //   const key = node.derive(sigsetIndex);
  //   const sig = key.sign(Buffer.from(msg));
  //   sigs = [...sigs, Array.from(sig)];
  // }
  // await wrappedExecuteTransaction(async () => {
  //   const tx = await cwBitcoinClient.submitCheckpointSignature({
  //     btcHeight,
  //     checkpointIndex: 6,
  //     sigs,
  //     xpub: encodeXpub({ key: xpub }),
  //   });
  //   console.log(tx.transactionHash);
  // });

  // const array = new Uint8Array(32);
  // let tx = await cwBitcoinClient.addValidators({
  //   addrs: [sender],
  //   consensusKeys: [Array.from(array.fill(0))],
  //   votingPowers: [10],
  // });
  // console.log("Add validators:", tx.transactionHash);
  // tx = await cwBitcoinClient.setSignatoryKey({
  //   xpub: encodeXpub({ key: xpub }),
  // });
  // console.log("Set signatory key:", tx.transactionHash);

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
  //     trusted_header: Buffer.from(
  //       toBinaryBlockHeader({
  //         version: 536870912,
  //         prev_blockhash:
  //           "000000000000001f6d8dc4976552a596eff2eb0df15b0d9ee61a55091a2050c2",
  //         merkle_root:
  //           "03a2f5712c4c44daafa6475007de611b91be9738fc005788b7072153d651f36f",
  //         time: 1705736135,
  //         bits: 422015362,
  //         nonce: 3433041756,
  //       })
  //     ).toString("base64"),
  //   },
  // });
  // console.log(tx.transactionHash);
};

main();
