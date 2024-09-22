export interface InstantiateMsg {}
export type ExecuteMsg = {
  relay_headers: {
    headers: WrappedHeader[];
  };
} | {
  update_header_config: {
    config: HeaderConfig;
  };
} | {
  update_config: {
    owner?: Addr | null;
  };
};
export type Binary = string;
export type Addr = string;
export interface WrappedHeader {
  header: Binary;
  height: number;
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
export type QueryMsg = {
  header_config: {};
} | {
  header_height: {};
} | {
  network: {};
} | {
  sidechain_block_hash: {};
} | {
  verify_tx_with_proof: {
    btc_height: number;
    btc_proof: Binary;
    btc_tx: Binary;
  };
};
export type MigrateMsg = string;
export type Uint32 = number;
export type String = string;
export type Null = null;