import { GasPrice } from "@cosmjs/stargate";

export interface Network {
  chainId: string;
  rpcEndpoint: string;
  prefix: string;
  gasPrice: GasPrice;
  feeToken: string;
  faucetUrl: string;
}

export const OraichainConfig: Network = {
  chainId: "Oraichain",
  rpcEndpoint: "https://rpc.orai.io",
  prefix: "orai",
  gasPrice: GasPrice.fromString("0.002orai"),
  feeToken: "orai",
  faucetUrl: "https://faucet.orai.io/",
};

export const WasmLocalConfig: Network = {
  chainId: "testing",
  rpcEndpoint: "http://127.0.0.1:26657",
  prefix: "orai",
  gasPrice: GasPrice.fromString("0.002orai"),
  feeToken: "orai",
  faucetUrl: "",
};
