import * as btc from "bitcoinjs-lib";
import { Buffer } from "buffer";
import { Vout } from "../@types";
import env from "../configs/env";

export enum ScriptPubkeyType {
  Pubkey = "pubkeyhash",
  WitnessKeyHash = "witness_v0_keyhash",
  WitnessScriptHash = "witness_v0_scripthash",
}

export function getCurrentNetwork() {
  if (env.bitcoin.network === "mainnet") {
    return btc.networks.bitcoin;
  }
  if (env.bitcoin.network === "testnet") {
    return btc.networks.testnet;
  }
  throw new Error("Invalid network");
}

export function calculateOutpointKey(txid: string, vout: number): string {
  return `${txid}:${vout}`;
}

export function toScriptPubKeyP2WSH(redeemScript: Buffer) {
  const redeemScriptHash = btc.crypto.sha256(redeemScript);
  const scriptPubKey = btc.script.compile([btc.opcodes.OP_0, redeemScriptHash]);
  return scriptPubKey;
}

export const decodeAddress = (output: Vout): string | null => {
  const scriptPubKeyBuffer = Buffer.from(output.scriptPubKey.hex, "hex");

  let address = null;
  switch (output.scriptPubKey.type) {
    case ScriptPubkeyType.WitnessKeyHash:
      address = btc.payments.p2pkh({
        output: scriptPubKeyBuffer,
        network: getCurrentNetwork(),
      }).address;
      break;
    case ScriptPubkeyType.WitnessScriptHash:
      address = btc.payments.p2wsh({
        output: scriptPubKeyBuffer,
        network: getCurrentNetwork(),
      }).address;
      break;
    case ScriptPubkeyType.Pubkey:
      const decodedScript = btc.script.decompile(scriptPubKeyBuffer);
      const pubKeyHash = decodedScript[2] as Buffer;
      address = btc.payments.p2pkh({
        hash: pubKeyHash,
        network: getCurrentNetwork(),
      }).address;
      break;
    default:
      return null;
  }

  return address;
};
