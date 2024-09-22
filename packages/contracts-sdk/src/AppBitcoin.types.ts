export type Addr = string;
export type Uint128 = string;
export type AssetInfo =
  | {
      token: {
        contract_addr: Addr;
      };
    }
  | {
      native_token: {
        denom: string;
      };
    };
export interface InstantiateMsg {
  light_client_contract: Addr;
  osor_entry_point_contract?: Addr | null;
  relayer_fee: Uint128;
  relayer_fee_receiver: Addr;
  relayer_fee_token: AssetInfo;
  swap_router_contract?: Addr | null;
  token_factory_contract: Addr;
  token_fee_receiver: Addr;
}
export type ExecuteMsg =
  | {
      update_config: {
        light_client_contract?: Addr | null;
        osor_entry_point_contract?: Addr | null;
        owner?: Addr | null;
        relayer_fee?: Uint128 | null;
        relayer_fee_receiver?: Addr | null;
        relayer_fee_token?: AssetInfo | null;
        swap_router_contract?: Addr | null;
        token_factory_contract?: Addr | null;
        token_fee?: Ratio | null;
        token_fee_receiver?: Addr | null;
      };
    }
  | {
      update_bitcoin_config: {
        config: BitcoinConfig;
      };
    }
  | {
      update_checkpoint_config: {
        config: CheckpointConfig;
      };
    }
  | {
      register_validator: {};
    }
  | {
      relay_deposit: {
        btc_height: number;
        btc_proof: Binary;
        btc_tx: Binary;
        btc_vout: number;
        dest: Dest;
        sigset_index: number;
      };
    }
  | {
      relay_checkpoint: {
        btc_height: number;
        btc_proof: Binary;
        cp_index: number;
      };
    }
  | {
      withdraw_to_bitcoin: {
        btc_address: string;
      };
    }
  | {
      submit_checkpoint_signature: {
        btc_height: number;
        checkpoint_index: number;
        sigs: Signature[];
        xpub: String;
      };
    }
  | {
      submit_recovery_signature: {
        sigs: Signature[];
        xpub: String;
      };
    }
  | {
      set_signatory_key: {
        xpub: String;
      };
    }
  | {
      register_denom: {
        metadata?: Metadata | null;
        subdenom: string;
      };
    }
  | {
      change_btc_denom_owner: {
        new_owner: string;
      };
    }
  | {
      trigger_begin_block: {
        hash: Binary;
      };
    };
export type Binary = string;
export type Dest =
  | {
      address: Addr;
    }
  | {
      ibc: IbcDest;
    };
export type Signature = number[];
export type String = string;
export interface Ratio {
  denominator: number;
  nominator: number;
}
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
export type QueryMsg =
  | {
      config: {};
    }
  | {
      bitcoin_config: {};
    }
  | {
      checkpoint_config: {};
    }
  | {
      signatory_key: {
        addr: Addr;
      };
    }
  | {
      deposit_fees: {
        index?: number | null;
      };
    }
  | {
      checkpoint_fees: {
        index?: number | null;
      };
    }
  | {
      withdrawal_fees: {
        address: string;
        index?: number | null;
      };
    }
  | {
      completed_checkpoint_txs: {
        limit: number;
      };
    }
  | {
      signed_recovery_txs: {};
    }
  | {
      checkpoint_tx: {
        index?: number | null;
      };
    }
  | {
      checkpoint_by_index: {
        index: number;
      };
    }
  | {
      building_checkpoint: {};
    }
  | {
      signing_recovery_txs: {
        xpub: String;
      };
    }
  | {
      signing_txs_at_checkpoint_index: {
        checkpoint_index: number;
        xpub: String;
      };
    }
  | {
      processed_outpoint: {
        key: string;
      };
    }
  | {
      confirmed_index: {};
    }
  | {
      building_index: {};
    }
  | {
      completed_index: {};
    }
  | {
      unhandled_confirmed_index: {};
    }
  | {
      change_rates: {
        interval: number;
      };
    }
  | {
      value_locked: {};
    }
  | {
      check_eligible_validator: {
        val_addr: string;
      };
    };
export interface MigrateMsg {}
export type CheckpointStatus = "building" | "signing" | "complete";
export interface Checkpoint {
  batches: Batch[];
  deposits_enabled: boolean;
  fee_rate: number;
  fees_collected: number;
  pending: [Dest, Coin][];
  signed_at_btc_height?: number | null;
  sigset: SignatorySet;
  status: CheckpointStatus;
}
export interface Batch {
  batch: BitcoinTx[];
  signed_txs: number;
}
export interface BitcoinTx {
  input: Input[];
  lock_time: number;
  output: Binary[];
  signed_inputs: number;
}
export interface Input {
  amount: number;
  dest: number[];
  est_witness_vsize: number;
  prevout: Binary;
  redeem_script: Binary;
  script_pubkey: Binary;
  signatures: ThresholdSig;
  sigset_index: number;
}
export interface ThresholdSig {
  len: number;
  message: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];
  signed: number;
  sigs: [Pubkey, Share][];
  threshold: number;
}
export interface Pubkey {
  bytes: number[];
}
export interface Share {
  power: number;
  sig?: Signature | null;
}
export interface Coin {
  amount: Uint128;
  denom: string;
}
export interface SignatorySet {
  create_time: number;
  index: number;
  possible_vp: number;
  present_vp: number;
  signatories: Signatory[];
}
export interface Signatory {
  pubkey: Pubkey;
  voting_power: number;
}
export type Uint32 = number;
export interface ChangeRates {
  sigset_change: number;
  withdrawal: number;
}
export type Boolean = boolean;
export type Uint64 = number;
export type ArrayOfBinary = Binary[];
export interface ConfigResponse {
  light_client_contract: Addr;
  osor_entry_point_contract?: Addr | null;
  owner: Addr;
  relayer_fee: Uint128;
  relayer_fee_receiver: Addr;
  relayer_fee_token: AssetInfo;
  swap_router_contract?: Addr | null;
  token_factory_contract: Addr;
  token_fee: Ratio;
  token_fee_receiver: Addr;
}
export type NullableUint32 = number | null;
export type NullableString = String | null;
export type ArrayOfTupleOfArraySize32OfUint8AndUint32 = [
  [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ],
  number
][];
