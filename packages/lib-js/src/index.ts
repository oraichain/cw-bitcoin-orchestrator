import {
  Checkpoint,
  CheckpointConfig,
  Dest,
  SignatorySet,
} from "@oraichain/bitcoin-bridge-contracts-sdk/build/AppBitcoin.types";
import * as btc from "bitcoinjs-lib";
import { convertSdkDestToWasmDest } from "./dest";
import { commitmentBytes } from "./wasm/cw_bitcoin_wasm";

export type BitcoinNetwork = "bitcoin" | "testnet" | "regtest";
export interface DepositOptions {
  relayers: string[];
  dest: Dest;
  requestTimeoutMs?: number;
  network?: BitcoinNetwork;
  successThreshold?: number;
}

export interface DepositSuccess {
  code: 0;
  bitcoinAddress: string;
}

export interface DepositFailureOther {
  code: 1;
  reason: string;
}

export interface DepositFailureCapacity {
  code: 2;
  reason: string;
}

export type DepositResult =
  | DepositSuccess
  | DepositFailureOther
  | DepositFailureCapacity;

export async function generateDepositAddress(
  opts: DepositOptions
): Promise<DepositResult> {
  try {
    let requestTimeoutMs = opts.requestTimeoutMs || 20_000;
    let successThreshold =
      typeof opts.successThreshold === "number" ? opts.successThreshold : 2 / 3;
    if (successThreshold <= 0 || successThreshold > 1) {
      throw new Error("opts.successThreshold must be between 0 - 1");
    }
    let successThresholdCount = Math.round(
      opts.relayers.length * successThreshold
    );

    let consensusRelayerResponse: string = await consensusReq(
      opts.relayers,
      successThresholdCount,
      requestTimeoutMs,
      getCheckpoint
    );
    let checkpoint = JSON.parse(consensusRelayerResponse).data as Checkpoint;
    let sigset = checkpoint.sigset;

    if (!checkpoint.deposits_enabled) {
      return {
        code: 2,
        reason: "Capacity limit reached",
      };
    }

    let consensusDepositAddress: string = await consensusReq(
      opts.relayers,
      successThresholdCount,
      requestTimeoutMs,
      (relayer: string) => {
        return getDepositAddress(relayer, sigset, opts.network, opts.dest);
      }
    );

    return {
      code: 0,
      bitcoinAddress: consensusDepositAddress,
    };
  } catch (e: any) {
    return {
      code: 1,
      reason: e.toString(),
    };
  }
}

async function getDepositAddress(
  relayer: string,
  sigset: SignatorySet,
  network: BitcoinNetwork | undefined,
  dest: Dest
) {
  const configResponse = await fetch(`${relayer}/api/checkpoint/config`).then(
    (res) => res.json()
  );
  const checkpointConfig = configResponse.data as CheckpointConfig;
  const encodedDest = commitmentBytes(convertSdkDestToWasmDest(dest));
  const depositScript = redeemScript(
    sigset,
    Buffer.from(encodedDest),
    checkpointConfig.sigset_threshold
  );
  let wsh = btc.payments.p2wsh({
    redeem: { output: depositScript },
    network: toNetwork(network),
  });
  let address = wsh.address;
  let res = await broadcast(relayer, address, sigset.index, dest);

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return address;
}

export async function broadcast(
  relayer: string,
  depositAddr: string,
  sigsetIndex: number,
  dest: Dest
) {
  return await fetch(
    `${relayer}/api/bitcoin/deposit?deposit_addr=${depositAddr}&sigset_index=${sigsetIndex}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dest }),
    }
  );
}

async function getCheckpoint(relayer: string): Promise<string> {
  return await fetch(`${relayer}/api/checkpoint`).then((res) => res.text());
}

export function redeemScript(
  sigset: SignatorySet,
  dest: Buffer,
  threshold: [number, number]
) {
  let truncation = BigInt(getTruncation(sigset, 23));
  let [numerator, denominator] = threshold;

  let firstSig = sigset.signatories[0];
  let truncatedVp = BigInt(firstSig.voting_power) >> truncation;

  let script = [];
  if (sigset.foundation_signatories) {
    script.push(Buffer.from([0]));
    script.push(op("OP_EQUAL"));
    script.push(op("OP_IF"));
  }
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

  if (sigset.foundation_signatories) {
    if (sigset.foundation_signatories?.length > 0) {
      let signatories = sigset.foundation_signatories;
      let totalVotingPower = signatories[0].voting_power;
      script.push(op("OP_ELSE"));
      script.push(Buffer.from(signatories[0].pubkey.bytes));
      script.push(op("OP_CHECKSIG"));
      script.push(op("OP_IF"));
      script.push(pushInt(BigInt(signatories[0].voting_power)));
      script.push(op("OP_ELSE"));
      script.push(pushInt(0n));
      script.push(op("OP_ENDIF"));
      for (let i = 1; i < signatories.length; i++) {
        script.push(op("OP_SWAP"));
        script.push(Buffer.from(signatories[i].pubkey.bytes));
        script.push(op("OP_CHECKSIG"));
        script.push(op("OP_IF"));
        script.push(pushInt(BigInt(signatories[i].voting_power)));
        script.push(op("OP_ADD"));
        script.push(op("OP_ENDIF"));
        totalVotingPower += signatories[i].voting_power;
      }
      let truncatedThreshold = Math.ceil(
        (totalVotingPower * numerator) / denominator
      );
      script.push(pushInt(BigInt(truncatedThreshold)));
      script.push(op("OP_GREATERTHANOREQUAL"));
    } else {
      script.push(op("OP_ELSE"));
      script.push(op("OP_RETURN"));
    }
    script.push(op("OP_ENDIF"));
  }

  return btc.script.compile(script as any);
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
