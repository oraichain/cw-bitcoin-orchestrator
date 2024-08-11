import { SignatorySet } from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import * as btc from "bitcoinjs-lib";
import { Buffer } from "buffer";
import { Vout } from "../@types";

export enum ScriptPubkeyType {
  Pubkey = "pubkeyhash",
  Witness = "witness_v0_keyhash",
}

export function calculateOutpointKey(txid: string, vout: number): string {
  return `${txid}:${vout}`;
}

export const decodeAddress = (output: Vout): string | null => {
  const scriptPubKeyBuffer = Buffer.from(output.scriptPubKey.hex, "hex");

  let address = null;
  switch (output.scriptPubKey.type) {
    case ScriptPubkeyType.Witness:
      address = btc.payments.p2wsh({
        redeem: { output: scriptPubKeyBuffer },
        network: btc.networks.testnet,
      }).address;
      break;
    case ScriptPubkeyType.Pubkey:
      const decodedScript = btc.script.decompile(scriptPubKeyBuffer);
      const pubKeyHash = decodedScript[2] as Buffer;
      address = btc.payments.p2pkh({
        hash: pubKeyHash,
        network: btc.networks.testnet,
      }).address;
      break;
    default:
      return null;
  }

  return address;
};

function presentVp(sigset: SignatorySet) {
  return sigset.signatories.reduce(
    (acc, cur) => acc + BigInt(cur.voting_power),
    0n
  );
}

function clz64(n: bigint) {
  if (n === 0n) {
    return 0;
  }
  return 64 - n.toString(2).length;
}

function getTruncation(sigset: SignatorySet, targetPrecision: number) {
  let vp = presentVp(sigset);
  let vpBits = 64 - clz64(vp);
  if (vpBits < targetPrecision) {
    return 0;
  }
  return vpBits - targetPrecision;
}

function pushInt(n: bigint) {
  return btc.script.number.encode(Number(n));
}

function op(name: string) {
  if (typeof btc.script.OPS[name] !== "number") {
    throw new Error(`Invalid op ${name}`);
  }
  return btc.script.OPS[name];
}

function redeemScript(
  sigset: SignatorySet,
  dest: Buffer,
  threshold: [number, number]
) {
  let truncation = BigInt(getTruncation(sigset, 23));
  let [numerator, denominator] = threshold;

  let firstSig = sigset.signatories[0];
  let truncatedVp = BigInt(firstSig.voting_power) >> truncation;

  let script = [];
  script.push(Buffer.from(firstSig.pubkey.bytes));
  script.push(op("OP_CHECKSIG"));
  script.push(op("OP_IF"));
  script.push(pushInt(truncatedVp));
  script.push(op("OP_ELSE"));
  script.push(op("OP_0"));
  script.push(op("OP_ENDIF"));

  for (let i = 1; i < sigset.signatories.length; i++) {
    let sig = sigset.signatories[i];
    let truncatedVp = BigInt(sig.voting_power) >> truncation;
    script.push(op("OP_SWAP"));
    script.push(Buffer.from(sig.pubkey.bytes));
    script.push(op("OP_CHECKSIG"));
    script.push(op("OP_IF"));
    script.push(pushInt(truncatedVp));
    script.push(op("OP_ADD"));
    script.push(op("OP_ENDIF"));
  }

  let truncatedThreshold =
    ((presentVp(sigset) * BigInt(numerator)) / BigInt(denominator)) >>
    truncation;
  script.push(pushInt(truncatedThreshold));
  script.push(op("OP_GREATERTHAN"));
  script.push(dest);
  script.push(op("OP_DROP"));

  return btc.script.compile(script as any);
}

export { redeemScript };
