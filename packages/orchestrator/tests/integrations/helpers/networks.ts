// data from https://github.com/cosmos/chain-registry/tree/master/testnets
import { GasPrice } from "@cosmjs/stargate";

export interface Network {
  chainId: string;
  rpcEndpoint: string;
  prefix: string;
  gasPrice: GasPrice;
  feeToken: string;
  faucetUrl: string;
}

export const WasmLocalConfig: Network = {
  chainId: "testing",
  rpcEndpoint: "http://127.0.0.1:26657",
  prefix: "orai",
  gasPrice: GasPrice.fromString("0.002orai"),
  feeToken: "orai",
  faucetUrl: "",
};
