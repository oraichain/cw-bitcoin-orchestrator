export type Uint128 = string;
export interface InstantiateMsg {
  fee?: Coin | null;
}
export interface Coin {
  amount: Uint128;
  denom: string;
}
export type ExecuteMsg = {
  create_denom: {
    metadata?: Metadata | null;
    subdenom: string;
  };
} | {
  change_denom_owner: {
    denom: string;
    new_admin_address: string;
  };
} | {
  change_admin: {
    denom: string;
    new_admin_address: string;
  };
} | {
  mint_tokens: {
    amount: Uint128;
    denom: string;
    mint_to_address: string;
  };
} | {
  burn_tokens: {
    amount: Uint128;
    burn_from_address: string;
    denom: string;
  };
} | {
  force_transfer: {
    amount: Uint128;
    denom: string;
    from_address: string;
    to_address: string;
  };
};
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
  get_denom: {
    creator_address: string;
    subdenom: string;
  };
} | {
  get_metadata: {
    denom: string;
  };
} | {
  denoms_by_creator: {
    creator: string;
  };
};
export interface DenomsByCreatorResponse {
  denoms: string[];
}
export interface FullDenomResponse {
  denom: string;
}
export interface MetadataResponse {
  metadata?: Metadata | null;
}