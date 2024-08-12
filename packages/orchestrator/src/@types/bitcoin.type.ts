import { Deposit } from "@oraichain/bitcoin-bridge-wasm-sdk";

export interface BlockHeader {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash: string;
}

export interface VerbosedBlockHeader extends BlockHeader {
  nextblockhash: string;
}

export type Vin = {
  txid: string;
  vout: number;
  scriptSig: {
    asm: string;
    hex: string;
  };
  sequence: number;
};

export type Vout = {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    type: string;
    desc: string;
    address: string;
  };
};

export type BitcoinTransaction = {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
  hex: string;
};

export type BitcoinBlock = {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash: string;
  strippedsize: number;
  size: number;
  weight: number;
  tx: BitcoinTransaction[]; // Array of transaction IDs
};

export type DepositInfo = {
  deposit: Deposit;
  confirmations: number;
};
