export interface InstantiateMsg {
  entry_point_contract_address: string;
}
export type ExecuteMsg = {
  ibc_transfer: {
    coin: Coin;
    info: IbcInfo;
    timeout_timestamp: number;
  };
};
export type Uint128 = string;
export interface Coin {
  amount: Uint128;
  denom: string;
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
export type QueryMsg = {
  in_progress_recover_address: {
    channel_id: string;
    sequence_id: number;
  };
};
export type String = string;