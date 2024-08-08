export type Addr = string;
export interface InstantiateMsg {
  bridge_wasm_addr?: Addr | null;
  token_factory_addr: Addr;
}
export type ExecuteMsg = {
  update_bitcoin_config: {
    config: BitcoinConfig;
  };
} | {
  update_checkpoint_config: {
    config: CheckpointConfig;
  };
} | {
  update_header_config: {
    config: HeaderConfig;
  };
} | {
  relay_headers: {
    headers: WrappedHeader[];
  };
} | {
  relay_deposit: {
    btc_height: number;
    btc_proof: Binary;
    btc_tx: Binary;
    btc_vout: number;
    dest: Dest;
    sigset_index: number;
  };
} | {
  relay_checkpoint: {
    btc_height: number;
    btc_proof: Binary;
    cp_index: number;
  };
} | {
  withdraw_to_bitcoin: {
    script_pubkey: Binary;
  };
} | {
  submit_checkpoint_signature: {
    btc_height: number;
    checkpoint_index: number;
    sigs: Signature[];
    xpub: HexBinary;
  };
} | {
  submit_recovery_signature: {
    sigs: Signature[];
    xpub: HexBinary;
  };
} | {
  set_signatory_key: {
    xpub: HexBinary;
  };
} | {
  add_validators: {
    addrs: string[];
    infos: [number, [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]][];
  };
} | {
  register_denom: {
    metadata?: Metadata | null;
    subdenom: string;
  };
};
export type Binary = string;
export type Dest = {
  address: Addr;
} | {
  ibc: IbcDest;
};
export type Signature = number[];
export type HexBinary = string;
export interface BitcoinConfig {
  capacity_limit: number;
  fee_pool_reward_split: [number, number];
  fee_pool_target_balance: number;
  max_deposit_age: number;
  max_offline_checkpoints: number;
  max_withdrawal_amount: number;
  max_withdrawal_script_length: number;
  min_checkpoint_confirmations: number;
  min_confirmations: number;
  min_deposit_amount: number;
  min_withdrawal_amount: number;
  min_withdrawal_checkpoints: number;
  transfer_fee: number;
  units_per_sat: number;
}
export interface CheckpointConfig {
  fee_rate: number;
  max_age: number;
  max_checkpoint_interval: number;
  max_fee_rate: number;
  max_inputs: number;
  max_outputs: number;
  max_unconfirmed_checkpoints: number;
  min_checkpoint_interval: number;
  min_fee_rate: number;
  sigset_threshold: [number, number];
  target_checkpoint_inclusion: number;
  user_fee_factor: number;
}
export interface HeaderConfig {
  max_length: number;
  max_target: number;
  max_time_increase: number;
  min_difficulty_blocks: boolean;
  retarget_interval: number;
  retargeting: boolean;
  target_spacing: number;
  target_timespan: number;
  trusted_header: Binary;
  trusted_height: number;
}
export interface WrappedHeader {
  header: Binary;
  height: number;
}
export interface IbcDest {
  memo: string;
  receiver: string;
  sender: string;
  source_channel: string;
  source_port: string;
  timeout_timestamp: number;
}
export interface Metadata {
  base?: string | null;
  denom_units: DenomUnit[];
  description?: string | null;
  display?: string | null;
  name?: string | null;
  symbol?: string | null;
}
export interface DenomUnit {
  aliases: string[];
  denom: string;
  exponent: number;
}
export type QueryMsg = {
  header_height: {};
} | {
  deposit_fees: {
    index?: number | null;
  };
} | {
  completed_checkpoint_txs: {
    limit: number;
  };
} | {
  signed_recovery_txs: {};
} | {
  withdrawal_fees: {
    address: string;
    index?: number | null;
  };
} | {
  sidechain_block_hash: {};
} | {
  checkpoint_by_index: {
    index: number;
  };
} | {
  signing_recovery_txs: {
    xpub: HexBinary;
  };
} | {
  signing_txs_at_checkpoint_index: {
    checkpoint_index: number;
    xpub: HexBinary;
  };
} | {
  confirmed_index: {};
} | {
  building_index: {};
} | {
  completed_index: {};
} | {
  unhandled_confirmed_index: {};
};
export interface MigrateMsg {}
export type Uint32 = number;
export type Uint64 = number;
export type ArrayOfBinary = Binary[];
export type ArrayOfTupleOfArraySize_32OfUint8AndUint32 = [[number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number], number][];