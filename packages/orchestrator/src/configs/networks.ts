import { GasPrice } from "@cosmjs/stargate";

export interface Network {
  prefix: string;
  gasPrice: GasPrice;
  feeToken: string;
}

export const OraichainConfig: Network = {
  prefix: "orai",
  gasPrice: GasPrice.fromString("0.002orai"),
  feeToken: "orai",
};

export const WasmLocalConfig: Network = {
  prefix: "orai",
  gasPrice: GasPrice.fromString("0.002orai"),
  feeToken: "orai",
};
