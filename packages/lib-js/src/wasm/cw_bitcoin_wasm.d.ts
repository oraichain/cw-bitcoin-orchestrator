/* tslint:disable */
/* eslint-disable */
/**
* @returns {DepositIndex}
*/
export function newDepositIndex(): DepositIndex;
/**
* @param {BlockHeader} header
* @param {number} height
* @returns {WrappedHeader}
*/
export function newWrappedHeader(header: BlockHeader, height: number): WrappedHeader;
/**
* @param {number} height
* @param {any} block_header
* @returns {HeaderConfig}
*/
export function newHeaderConfig(height: number, block_header: any): HeaderConfig;
/**
* @param {HeaderConfig} header_config
* @returns {WorkHeader}
*/
export function newWorkHeader(header_config: HeaderConfig): WorkHeader;
/**
* @param {BlockHeader} inner
* @returns {string}
*/
export function toBase64BlockHeader(inner: BlockHeader): string;
/**
* @param {string} value
* @returns {BlockHeader}
*/
export function fromBase64BlockHeader(value: string): BlockHeader;
/**
* @param {BlockHeader} inner
* @returns {Uint8Array}
*/
export function toBinaryBlockHeader(inner: BlockHeader): Uint8Array;
/**
* @param {Uint8Array} value
* @returns {BlockHeader}
*/
export function fromBinaryBlockHeader(value: Uint8Array): BlockHeader;
/**
* @param {Script} inner
* @returns {string}
*/
export function toBase64Script(inner: Script): string;
/**
* @param {string} value
* @returns {Script}
*/
export function fromBase64Script(value: string): Script;
/**
* @param {Script} inner
* @returns {Uint8Array}
*/
export function toBinaryScript(inner: Script): Uint8Array;
/**
* @param {Uint8Array} value
* @returns {Script}
*/
export function fromBinaryScript(value: Uint8Array): Script;
/**
* @param {PartialMerkleTree} inner
* @returns {string}
*/
export function toBase64PartialMerkleTree(inner: PartialMerkleTree): string;
/**
* @param {string} value
* @returns {PartialMerkleTree}
*/
export function fromBase64PartialMerkleTree(value: string): PartialMerkleTree;
/**
* @param {PartialMerkleTree} inner
* @returns {Uint8Array}
*/
export function toBinaryPartialMerkleTree(inner: PartialMerkleTree): Uint8Array;
/**
* @param {Uint8Array} value
* @returns {PartialMerkleTree}
*/
export function fromBinaryPartialMerkleTree(value: Uint8Array): PartialMerkleTree;
/**
* @param {Transaction} inner
* @returns {string}
*/
export function toBase64Transaction(inner: Transaction): string;
/**
* @param {string} value
* @returns {Transaction}
*/
export function fromBase64Transaction(value: string): Transaction;
/**
* @param {Transaction} inner
* @returns {Uint8Array}
*/
export function toBinaryTransaction(inner: Transaction): Uint8Array;
/**
* @param {Uint8Array} value
* @returns {Transaction}
*/
export function fromBinaryTransaction(value: Uint8Array): Transaction;
/**
* @param {MerkleBlock} inner
* @returns {string}
*/
export function toBase64MerkleBlock(inner: MerkleBlock): string;
/**
* @param {string} value
* @returns {MerkleBlock}
*/
export function fromBase64MerkleBlock(value: string): MerkleBlock;
/**
* @param {MerkleBlock} inner
* @returns {Uint8Array}
*/
export function toBinaryMerkleBlock(inner: MerkleBlock): Uint8Array;
/**
* @param {Uint8Array} value
* @returns {MerkleBlock}
*/
export function fromBinaryMerkleBlock(value: Uint8Array): MerkleBlock;
/**
* @param {Dest} dest
* @returns {Uint8Array}
*/
export function commitmentBytes(dest: Dest): Uint8Array;
/**
* @param {Dest} dest
* @returns {string}
*/
export function toReceiverAddr(dest: Dest): string;
/**
* @param {Dest} dest
* @returns {string}
*/
export function toSourceAddr(dest: Dest): string;
/**
* @param {string} raw_tx
* @returns {Transaction}
*/
export function decodeRawTx(raw_tx: string): Transaction;
/**
* @param {Transaction} tx
* @returns {string}
*/
export function getBitcoinTransactionTxid(tx: Transaction): string;
/**
* @param {Xpub} xpub
* @returns {string}
*/
export function encodeXpub(xpub: Xpub): string;
/**
* @param {SignatorySet} sigset
* @param {number} bridge_fee_rate
* @param {number} miner_fee_rate
* @param {boolean} deposits_enabled
* @returns {RawSignatorySet}
*/
export function newRawSignatorySet(sigset: SignatorySet, bridge_fee_rate: number, miner_fee_rate: number, deposits_enabled: boolean): RawSignatorySet;
/**
* @param {string} hex_script
* @param {bigint} numerator
* @param {bigint} denominator
* @returns {SignatorySet}
*/
export function newSignatorySet(hex_script: string, numerator: bigint, denominator: bigint): SignatorySet;
/**
* @param {Shares} shares
* @returns {ThresholdSig}
*/
export function newThresholdSig(shares: Shares): ThresholdSig;
/**
* @returns {number}
*/
export function getGlobalBridgeFeeRate(): number;
/**
* @returns {BigUint64Array}
*/
export function getGlobalSigsetThreshold(): BigUint64Array;
/**
* @returns {number}
*/
export function getGlobalHeaderBatchSize(): number;
/**
* @returns {bigint}
*/
export function getMaxSignatories(): bigint;
export type Adapter<T> = string;

export interface HeaderConfig {
    max_length: number;
    max_time_increase: number;
    trusted_height: number;
    retarget_interval: number;
    target_spacing: number;
    target_timespan: number;
    max_target: number;
    retargeting: boolean;
    min_difficulty_blocks: boolean;
    trusted_header: Adapter<BlockHeader>;
}

export interface WorkHeader {
    chain_work: Adapter<Uint256>;
    header: WrappedHeader;
}

export interface HeaderQueue {
    current_work: Adapter<Uint256>;
    config: HeaderConfig;
}

export interface WrappedHeader {
    height: number;
    header: Adapter<BlockHeader>;
}

export interface IbcDest {
    source_port: string;
    source_channel: string;
    receiver: string;
    sender: string;
    timeout_timestamp: number;
    memo: string;
}

export type Dest = { Address: string } | { Ibc: IbcDest };

export interface Xpub {
    key: string;
}

export interface DepositsQuery {
    receiver: string;
}

export interface DepositAddress {
    sigset_index: number;
    deposit_addr: string;
}

export interface Sigset {
    sigset_index: number;
}

export interface RawSignatorySet {
    signatories: RawSignatory[];
    index: number;
    bridgeFeeRate: number;
    minerFeeRate: number;
    depositsEnabled: boolean;
    threshold: [number, number];
}

export interface RawSignatory {
    voting_power: number;
    pubkey: number[];
}

export interface WatchedScripts {
    scripts: Record<string, [Dest, number]>;
    sigsets: Record<number, [SignatorySet, Dest[]]>;
}

export interface WatchedScriptStore {
    scripts: WatchedScripts;
    file_path: string;
}

export interface Signatory {
    voting_power: number;
    pubkey: Pubkey;
}

export interface SignatorySet {
    create_time: number;
    present_vp: number;
    possible_vp: number;
    index: number;
    signatories: Signatory[];
}

export type Message = number[];

export type Signature = number[];

export interface Pubkey {
    bytes: number[];
}

export interface ThresholdSig {
    threshold: number;
    signed: number;
    message: Message;
    len: number;
    sigs: [Pubkey, Share][];
}

export interface Share {
    power: number;
    sig?: Signature;
}

export type Shares = [Pubkey, Share][];

export interface DepositIndex {
    receiver_index: { [key: string]: { [key: string]: { [key: string]: Deposit } } };
}

export interface DepositInfo {
    deposit: Deposit;
    confirmations: number;
}

export interface Deposit {
    txid: Txid;
    vout: number;
    amount: number;
    height?: number;
}

export type Uint128 = number[];

export type Uint256 = number[];

export interface MerkleBlock {
    header: BlockHeader;
    txn: PartialMerkleTree;
}

export interface PartialMerkleTree {
    num_transactions: number;
    bits: boolean[];
    hashes: TxMerkleNode[];
}

export type ChildNumber = { Normal: { index: number } } | { Hardened: { index: number } };

export type Fingerprint = [number, number, number, number];

export type ChainCode = number[];

export interface Address {
    payload: Payload;
    network: Network;
}

export type Payload = { PubkeyHash: PubkeyHash } | { ScriptHash: ScriptHash } | { WitnessProgram: { version: WitnessVersion; program: number[] } };

export type WitnessVersion = "V0" | "V1" | "V2" | "V3" | "V4" | "V5" | "V6" | "V7" | "V8" | "V9" | "V10" | "V11" | "V12" | "V13" | "V14" | "V15" | "V16";

export type FilterHeader = string;

export type FilterHash = string;

export type XpubIdentifier = string;

export type WitnessCommitment = string;

export type WitnessMerkleNode = string;

export type TxMerkleNode = string;

export type WScriptHash = string;

export type WPubkeyHash = string;

export type ScriptHash = string;

export type PubkeyHash = string;

export type Sighash = string;

export type BlockHash = string;

export type Wtxid = string;

export type Txid = string;

export interface Witness {
    content: number[];
    witness_elements: number;
    last: number;
    second_to_last: number;
}

export interface BlockHeader {
    version: number;
    prev_blockhash: BlockHash;
    merkle_root: TxMerkleNode;
    time: number;
    bits: number;
    nonce: number;
}

export interface Transaction {
    version: number;
    lock_time: PackedLockTime;
    input: TxIn[];
    output: TxOut[];
}

export interface TxOut {
    value: number;
    script_pubkey: Script;
}

export type Sequence = number;

export interface TxIn {
    previous_output: OutPoint;
    script_sig: Script;
    sequence: Sequence;
    witness: Witness;
}

export interface OutPoint {
    txid: Txid;
    vout: number;
}

export type Script = number[];

export type PackedLockTime = number;

export type Network = "Bitcoin" | "Testnet" | "Signet" | "Regtest";


export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly newDepositIndex: () => number;
  readonly newWrappedHeader: (a: number, b: number) => number;
  readonly newHeaderConfig: (a: number, b: number, c: number) => void;
  readonly newWorkHeader: (a: number) => number;
  readonly toBase64BlockHeader: (a: number, b: number) => void;
  readonly fromBase64BlockHeader: (a: number, b: number, c: number) => void;
  readonly toBinaryBlockHeader: (a: number, b: number) => void;
  readonly fromBinaryBlockHeader: (a: number, b: number) => void;
  readonly toBase64Script: (a: number, b: number) => void;
  readonly fromBase64Script: (a: number, b: number, c: number) => void;
  readonly toBinaryScript: (a: number, b: number) => void;
  readonly fromBinaryScript: (a: number, b: number) => void;
  readonly toBase64PartialMerkleTree: (a: number, b: number) => void;
  readonly fromBase64PartialMerkleTree: (a: number, b: number, c: number) => void;
  readonly toBinaryPartialMerkleTree: (a: number, b: number) => void;
  readonly fromBinaryPartialMerkleTree: (a: number, b: number) => void;
  readonly toBase64Transaction: (a: number, b: number) => void;
  readonly fromBase64Transaction: (a: number, b: number, c: number) => void;
  readonly toBinaryTransaction: (a: number, b: number) => void;
  readonly fromBinaryTransaction: (a: number, b: number) => void;
  readonly toBase64MerkleBlock: (a: number, b: number) => void;
  readonly fromBase64MerkleBlock: (a: number, b: number, c: number) => void;
  readonly toBinaryMerkleBlock: (a: number, b: number) => void;
  readonly fromBinaryMerkleBlock: (a: number, b: number) => void;
  readonly commitmentBytes: (a: number, b: number) => void;
  readonly toReceiverAddr: (a: number, b: number) => void;
  readonly toSourceAddr: (a: number, b: number) => void;
  readonly decodeRawTx: (a: number, b: number) => number;
  readonly getBitcoinTransactionTxid: (a: number, b: number) => void;
  readonly encodeXpub: (a: number, b: number) => void;
  readonly newRawSignatorySet: (a: number, b: number, c: number, d: number) => number;
  readonly newSignatorySet: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly newThresholdSig: (a: number) => number;
  readonly getGlobalBridgeFeeRate: () => number;
  readonly getGlobalSigsetThreshold: (a: number) => void;
  readonly getGlobalHeaderBatchSize: () => number;
  readonly getMaxSignatories: () => number;
  readonly rustsecp256k1_v0_6_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_6_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_6_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_6_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
