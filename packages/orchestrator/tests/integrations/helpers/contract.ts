// import { SigningCosmWasmClient } from "cosmwasm";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Contract, loadContract } from "./utils";
import {
  PrivateKey,
  MsgStoreCode,
  createTransaction,
  ChainRestAuthApi,
  BaseAccount,
  TxGrpcClient,
  Msgs,
  TxResponse,
} from "@injectivelabs/sdk-ts";
import { ChainInfo, NetworkEndpoints } from "@injectivelabs/networks";
import { getStdFee } from "@injectivelabs/utils";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";

interface UploadResults {
  [name: string]: number;
}

/**
 *
 * @param client
 * @param signer
 * @param contracts
 * @returns
 */
export async function uploadContracts(
  client: SigningCosmWasmClient,
  signer: string,
  contracts: Contract[]
): Promise<UploadResults> {
  const uploaded: UploadResults = {};
  for (const contract of contracts) {
    const wasm = await loadContract(contract);
    console.debug(`Uploading ${contract.name}...`);
    const receipt = await client.upload(signer, wasm, "auto");

    uploaded[contract.name] = receipt.codeId;
    console.log(`Uploaded ${contract.name} with code id ${receipt.codeId}`);
  }
  return uploaded;
}

export const executeTransaction = async (
  privateKey: PrivateKey,
  network: ChainInfo & NetworkEndpoints,
  msg: Msgs | Msgs[]
): Promise<TxResponse> => {
  const pubKey = privateKey.toPublicKey().toBase64();
  const chainId = network.chainId;

  const chainRestAuthApi = new ChainRestAuthApi(network.rest);
  const accountDetailsResponse = await chainRestAuthApi.fetchAccount(
    privateKey.toBech32()
  );
  const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

  const { txRaw, signBytes } = createTransaction({
    pubKey,
    chainId,
    fee: getStdFee({
      gas: 5000000,
    }),
    message: msg,
    sequence: baseAccount.sequence,
    accountNumber: baseAccount.accountNumber,
  });

  const signature = await privateKey.sign(Buffer.from(signBytes));
  txRaw.signatures = [signature];
  const txService = new TxGrpcClient(network.grpc);

  return await txService.broadcast(txRaw);
};

export async function uploadContractsInj(
  privateKey: PrivateKey,
  signer: string,
  network: ChainInfo & NetworkEndpoints,
  contracts: Contract[]
): Promise<UploadResults> {
  const uploaded: UploadResults = {};
  for (const contract of contracts) {
    const wasm = await loadContract(contract);
    console.debug(`Uploading ${contract.name}...`);

    const msg = MsgStoreCode.fromJSON({
      sender: signer,
      wasmBytes: wasm,
    });

    const txResponse = await executeTransaction(privateKey, network, msg);

    const codeId = JSON.parse(txResponse.rawLog)[0]
      .events.filter(
        (event: any) => event.type == "cosmwasm.wasm.v1.EventCodeStored"
      )[0]
      .attributes.filter((attribute: any) => attribute.key == "code_id")[0]
      .value as string;

    uploaded[contract.name] = parseInt(codeId.split('"')[1]);
  }
  return uploaded;
}
