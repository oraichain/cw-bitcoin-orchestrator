import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import path from "path";
import { uploadContracts } from "./helpers/contract";
import { EntryPointClient } from "./testdata/interfaces";

export async function initOsorContract(
  client: SigningCosmWasmClient,
  address: string
) {
  const contracts = [
    {
      name: "skip_api_entry_point",
      wasmFile: path.join(__dirname, "testdata/skip-api-entry-point.wasm"),
    },
    {
      name: "skip_api_ibc_adapter_ibc_hooks",
      wasmFile: path.join(
        __dirname,
        "testdata/skip-api-ibc-adapter-ibc-hooks.wasm"
      ),
    },
  ];

  // upload contract
  const codeId = await uploadContracts(client, address, contracts);
  const contractId = {
    skipApiEntryPoint: codeId.skip_api_entry_point,
    skipApiIbcAdapterIbcHooks: codeId.skip_api_ibc_adapter_ibc_hooks,
  };

  const entryPoint = await client.instantiate(
    address,
    contractId.skipApiEntryPoint,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    {} as epInstantiateMsg,
    "entry point test",
    "auto",
    {
      admin: address,
    }
  );
  console.log("Entrypoint contract:", entryPoint.contractAddress);

  const ibcHooks = await client.instantiate(
    address,
    contractId.skipApiIbcAdapterIbcHooks,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    {
      entry_point_contract_address: entryPoint.contractAddress,
    },
    "ibc hooks test",
    "auto",
    {
      admin: address,
    }
  );

  const entryPointClient = new EntryPointClient(
    client,
    address,
    entryPoint.contractAddress
  );
  const tx = await entryPointClient.updateConfig({
    ibcTransferContractAddress: ibcHooks.contractAddress,
  });

  return {
    entryPointAddress: entryPoint.contractAddress,
    ibcHooksAddress: ibcHooks.contractAddress,
  };
}

export async function initBitcoinContract(
  client: SigningCosmWasmClient,
  address: string,
  entryPointAddress: string
) {
  const contracts = [
    {
      name: "cw_light_client_bitcoin",
      wasmFile: path.join(__dirname, "testdata/cw-light-client-bitcoin.wasm"),
    },
    {
      name: "cw_app_bitcoin",
      wasmFile: path.join(__dirname, "testdata/cw-app-bitcoin.wasm"),
    },
    {
      name: "token_factory",
      wasmFile: path.join(__dirname, "testdata/tokenfactory.wasm"),
    },
  ];
  // upload contract
  const codeId = await uploadContracts(client, address, contracts);
  const contractId = {
    tokenFactory: codeId.token_factory,
    cwLightClientBitcoin: codeId.cw_light_client_bitcoin,
    cwAppBitcoin: codeId.cw_app_bitcoin,
  };

  const tokenFactoryMsg = {};
  const tokenFactoryContract = await client.instantiate(
    address,
    contractId.tokenFactory,
    tokenFactoryMsg,
    "bitcoin app contract",
    "auto",
    {
      admin: address,
    }
  );

  const lightClientMsg = {};
  const lightClientContract = await client.instantiate(
    address,
    contractId.cwLightClientBitcoin,
    lightClientMsg,
    "bitcoin light client contract",
    "auto",
    {
      admin: address,
    }
  );

  const appMsg = {
    light_client_contract: lightClientContract.contractAddress,
    token_factory_contract: tokenFactoryContract.contractAddress,
    relayer_fee: "0",
    relayer_fee_receiver: "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd",
    relayer_fee_token: {
      native_token: {
        denom: "orai",
      },
    },
    token_fee_receiver: "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd",
    osor_entry_point_contract: entryPointAddress,
  };

  const appContract = await client.instantiate(
    address,
    contractId.cwAppBitcoin,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    appMsg,
    "bitcoin app contract",
    "auto",
    {
      admin: address,
    }
  );

  return {
    lightClientBitcoinAddress: lightClientContract.contractAddress,
    appBitcoinAddress: appContract.contractAddress,
    tokenFactoryAddress: tokenFactoryContract.contractAddress,
  };
}
