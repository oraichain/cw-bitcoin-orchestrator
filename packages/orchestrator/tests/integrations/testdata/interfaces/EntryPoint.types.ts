export interface InstantiateMsg {
  ibc_transfer_contract_address?: string | null;
  ibc_wasm_contract_address?: string | null;
  swap_venues?: SwapVenue[] | null;
}
export interface SwapVenue {
  adapter_contract_address: string;
  name: string;
}
export type ExecuteMsg = {
  receive: Cw20ReceiveMsg;
} | {
  swap_and_action_with_recover: {
    affiliates: Affiliate[];
    min_asset: Asset;
    post_swap_action: Action;
    recovery_addr: Addr;
    sent_asset?: Asset | null;
    timeout_timestamp: number;
    user_swap: Swap;
  };
} | {
  swap_and_action: {
    affiliates: Affiliate[];
    min_asset: Asset;
    post_swap_action: Action;
    sent_asset?: Asset | null;
    timeout_timestamp: number;
    user_swap: Swap;
  };
} | {
  user_swap: {
    affiliates: Affiliate[];
    min_asset: Asset;
    remaining_asset: Asset;
    swap: Swap;
  };
} | {
  post_swap_action: {
    exact_out: boolean;
    min_asset: Asset;
    post_swap_action: Action;
    timeout_timestamp: number;
  };
} | {
  update_config: {
    ibc_transfer_contract_address?: string | null;
    ibc_wasm_contract_address?: string | null;
    owner?: Addr | null;
    swap_venues?: SwapVenue[] | null;
  };
} | {
  universal_swap: {
    memo: string;
  };
};
export type Uint128 = string;
export type Binary = string;
export type Asset = {
  native: Coin;
} | {
  cw20: Cw20Coin;
};
export type Action = {
  transfer: {
    to_address: string;
  };
} | {
  ibc_transfer: {
    fee_swap?: SwapExactAssetOut | null;
    ibc_info: IbcInfo;
  };
} | {
  contract_call: {
    contract_address: string;
    msg: Binary;
  };
} | {
  ibc_wasm_transfer: {
    fee_swap?: SwapExactAssetOut | null;
    ibc_wasm_info: TransferBackMsg;
  };
};
export type Addr = string;
export type Swap = {
  swap_exact_asset_in: SwapExactAssetIn;
} | {
  swap_exact_asset_out: SwapExactAssetOut;
} | {
  smart_swap_exact_asset_in: SmartSwapExactAssetIn;
};
export interface Cw20ReceiveMsg {
  amount: Uint128;
  msg: Binary;
  sender: string;
}
export interface Affiliate {
  address: string;
  basis_points_fee: Uint128;
}
export interface Coin {
  amount: Uint128;
  denom: string;
}
export interface Cw20Coin {
  address: string;
  amount: Uint128;
}
export interface SwapExactAssetOut {
  operations: SwapOperation[];
  refund_address?: string | null;
  swap_venue_name: string;
}
export interface SwapOperation {
  denom_in: string;
  denom_out: string;
  interface?: Binary | null;
  pool: string;
}
export interface IbcInfo {
  fee?: IbcFee | null;
  memo: string;
  receiver: string;
  recover_address: string;
  source_channel: string;
}
export interface IbcFee {
  ack_fee: Coin[];
  recv_fee: Coin[];
  timeout_fee: Coin[];
}
export interface TransferBackMsg {
  local_channel_id: string;
  memo?: string | null;
  remote_address: string;
  remote_denom: string;
  timeout?: number | null;
}
export interface SwapExactAssetIn {
  operations: SwapOperation[];
  swap_venue_name: string;
}
export interface SmartSwapExactAssetIn {
  routes: Route[];
  swap_venue_name: string;
}
export interface Route {
  offer_asset: Asset;
  operations: SwapOperation[];
}
export type QueryMsg = {
  swap_venue_adapter_contract: {
    name: string;
  };
} | {
  ibc_transfer_adapter_contract: {};
};