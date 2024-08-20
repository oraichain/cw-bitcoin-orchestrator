import {
  Dest,
  SignatorySet,
} from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import * as btc from "bitcoinjs-lib";

export type BitcoinNetwork = "bitcoin" | "testnet" | "regtest";

export interface DepositOptions {
  relayers: string[];
  dest: Dest;
  requestTimeoutMs?: number;
  network?: BitcoinNetwork;
  successThreshold?: number;
}

function toNetwork(network: BitcoinNetwork | undefined) {
  if (network === "bitcoin" || typeof network === "undefined") {
    return btc.networks.bitcoin;
  } else if (network === "testnet") {
    return btc.networks.testnet;
  } else if (network === "regtest") {
    return btc.networks.regtest;
  }

  throw new Error(`Invalid Bitcoin network: ${network}`);
}

function consensusReq(
  relayers: string[],
  successThreshold: number,
  timeoutMs: number,
  f: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    let responseCount = 0;
    let responses: Record<string, number> = {};

    function maybeReject() {
      if (responseCount === relayers.length) {
        reject(Error("Failed to get consensus response from relayer set"));
      }
    }

    for (let relayer of relayers) {
      withTimeout(f(relayer), timeoutMs).then(
        (res) => {
          responses[res] = (responses[res] || 0) + 1;
          if (responses[res] >= successThreshold) {
            return resolve(res);
          }
          maybeReject();
        },
        (err) => {
          console.log(`${relayer}: ${err}`);
          responseCount += 1;
          maybeReject();
        }
      );
    }
  });
}

function withTimeout(promise: Promise<any>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(Error("Timeout")), timeoutMs);
    }),
  ]);
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

export { redeemScript };
