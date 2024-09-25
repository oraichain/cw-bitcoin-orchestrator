import {
  SigningCosmWasmClient,
  createWasmAminoConverters,
} from "@cosmjs/cosmwasm-stargate";
import { createDefaultAminoConverters } from "@cosmjs/stargate";
import {
  DirectSecp256k1HdWallet,
  isOfflineDirectSigner,
} from "@cosmjs/proto-signing";
import { Secp256k1HdWallet, makeCosmoshubPath } from "@cosmjs/amino";

import { Network } from "../networks";
import { PrivateKey } from "@injectivelabs/sdk-ts";
import { AminoTypes } from "@cosmjs/stargate";

/**
 *
 * @param mnemonic
 * @param network
 * @returns
 **/
export async function connect(
  mnemonic: string,
  network: Network,
  offline: boolean = true
) {
  const { prefix, gasPrice, feeToken, rpcEndpoint } = network;
  const hdPath = makeCosmoshubPath(0);

  // Setup signer

  let signer;
  let address;

  if (offline) {
    const offlineSigner = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix,
      hdPaths: [hdPath],
    });
    const { address: addr } = (await offlineSigner.getAccounts())[0];
    signer = offlineSigner;
    address = addr;
  } else {
    const onlineSigner = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix,
    });
    const { address: addr } = (await onlineSigner.getAccounts())[0];
    signer = onlineSigner;
    address = addr;
  }

  const customAminoConverter = {
    "nomic/MsgSetRecoveryAddress": {
      aminoType: "nomic/MsgSetRecoveryAddress",
      toAmino: ({ recovery_address }: any) => ({
        recovery_address: recovery_address,
      }),
      fromAmino: ({ recovery_address }: any) => ({
        recovery_address: recovery_address,
      }),
    },
  };

  const customAminoConverter1 = {
    "nomic/MsgClaimIbcBitcoin": {
      aminoType: "nomic/MsgClaimIbcBitcoin",
      toAmino: ({}) => ({}),
      fromAmino: ({}) => ({}),
    },
  };

  // Init SigningCosmWasmClient client
  const client = await SigningCosmWasmClient.connectWithSigner(
    rpcEndpoint,
    signer,
    {
      gasPrice,
      aminoTypes: new AminoTypes({
        ...createDefaultAminoConverters(),
        ...createWasmAminoConverters(),
        ...customAminoConverter1,
        ...customAminoConverter,
      }),
    }
  );

  return { client, address, signer };
}

export const connectINJ = async (mnemonic: string) => {
  const privateKey = PrivateKey.fromMnemonic(mnemonic);
  const injectiveAddress = privateKey.toBech32();

  return {
    privateKey,
    address: injectiveAddress,
  };
};
