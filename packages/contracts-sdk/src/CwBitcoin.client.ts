/**
 * This file was automatically generated by @oraichain/ts-codegen@0.35.9.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @oraichain/ts-codegen generate command to regenerate this file.
 */

import { Coin, StdFee } from "@cosmjs/amino";
import {
  CosmWasmClient,
  ExecuteResult,
  SigningCosmWasmClient,
} from "@cosmjs/cosmwasm-stargate";
import {
  ArrayOfBinary,
  ArrayOfTupleOfArraySize32OfUint8AndUint32,
  Binary,
  BitcoinConfig,
  CheckpointConfig,
  Dest,
  HeaderConfig,
  HexBinary,
  Metadata,
  Signature,
  Uint32,
  Uint64,
  WrappedHeader,
} from "./CwBitcoin.types";
export interface CwBitcoinReadOnlyInterface {
  contractAddress: string;
  headerHeight: () => Promise<Uint32>;
  depositFees: ({ index }: { index?: number }) => Promise<Uint64>;
  completedCheckpointTxs: ({
    limit,
  }: {
    limit: number;
  }) => Promise<ArrayOfBinary>;
  signedRecoveryTxs: () => Promise<ArrayOfBinary>;
  withdrawalFees: ({
    address,
    index,
  }: {
    address: string;
    index?: number;
  }) => Promise<Uint64>;
  sidechainBlockHash: () => Promise<HexBinary>;
  checkpointByIndex: ({ index }: { index: number }) => Promise<Uint64>;
  signingRecoveryTxs: ({
    xpub,
  }: {
    xpub: HexBinary;
  }) => Promise<ArrayOfTupleOfArraySize32OfUint8AndUint32>;
  signingTxsAtCheckpointIndex: ({
    checkpointIndex,
    xpub,
  }: {
    checkpointIndex: number;
    xpub: HexBinary;
  }) => Promise<ArrayOfTupleOfArraySize32OfUint8AndUint32>;
  confirmedIndex: () => Promise<Uint32>;
  buildingIndex: () => Promise<Uint32>;
  completedIndex: () => Promise<Uint32>;
  unhandledConfirmedIndex: () => Promise<Uint32>;
}
export class CwBitcoinQueryClient implements CwBitcoinReadOnlyInterface {
  client: CosmWasmClient;
  contractAddress: string;

  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client;
    this.contractAddress = contractAddress;
    this.headerHeight = this.headerHeight.bind(this);
    this.depositFees = this.depositFees.bind(this);
    this.completedCheckpointTxs = this.completedCheckpointTxs.bind(this);
    this.signedRecoveryTxs = this.signedRecoveryTxs.bind(this);
    this.withdrawalFees = this.withdrawalFees.bind(this);
    this.sidechainBlockHash = this.sidechainBlockHash.bind(this);
    this.checkpointByIndex = this.checkpointByIndex.bind(this);
    this.signingRecoveryTxs = this.signingRecoveryTxs.bind(this);
    this.signingTxsAtCheckpointIndex =
      this.signingTxsAtCheckpointIndex.bind(this);
    this.confirmedIndex = this.confirmedIndex.bind(this);
    this.buildingIndex = this.buildingIndex.bind(this);
    this.completedIndex = this.completedIndex.bind(this);
    this.unhandledConfirmedIndex = this.unhandledConfirmedIndex.bind(this);
  }

  headerHeight = async (): Promise<Uint32> => {
    return this.client.queryContractSmart(this.contractAddress, {
      header_height: {},
    });
  };
  depositFees = async ({ index }: { index?: number }): Promise<Uint64> => {
    return this.client.queryContractSmart(this.contractAddress, {
      deposit_fees: {
        index,
      },
    });
  };
  completedCheckpointTxs = async ({
    limit,
  }: {
    limit: number;
  }): Promise<ArrayOfBinary> => {
    return this.client.queryContractSmart(this.contractAddress, {
      completed_checkpoint_txs: {
        limit,
      },
    });
  };
  signedRecoveryTxs = async (): Promise<ArrayOfBinary> => {
    return this.client.queryContractSmart(this.contractAddress, {
      signed_recovery_txs: {},
    });
  };
  withdrawalFees = async ({
    address,
    index,
  }: {
    address: string;
    index?: number;
  }): Promise<Uint64> => {
    return this.client.queryContractSmart(this.contractAddress, {
      withdrawal_fees: {
        address,
        index,
      },
    });
  };
  sidechainBlockHash = async (): Promise<HexBinary> => {
    return this.client.queryContractSmart(this.contractAddress, {
      sidechain_block_hash: {},
    });
  };
  checkpointByIndex = async ({ index }: { index: number }): Promise<Uint64> => {
    return this.client.queryContractSmart(this.contractAddress, {
      checkpoint_by_index: {
        index,
      },
    });
  };
  signingRecoveryTxs = async ({
    xpub,
  }: {
    xpub: HexBinary;
  }): Promise<ArrayOfTupleOfArraySize32OfUint8AndUint32> => {
    return this.client.queryContractSmart(this.contractAddress, {
      signing_recovery_txs: {
        xpub,
      },
    });
  };
  signingTxsAtCheckpointIndex = async ({
    checkpointIndex,
    xpub,
  }: {
    checkpointIndex: number;
    xpub: HexBinary;
  }): Promise<ArrayOfTupleOfArraySize32OfUint8AndUint32> => {
    return this.client.queryContractSmart(this.contractAddress, {
      signing_txs_at_checkpoint_index: {
        checkpoint_index: checkpointIndex,
        xpub,
      },
    });
  };
  confirmedIndex = async (): Promise<Uint32> => {
    return this.client.queryContractSmart(this.contractAddress, {
      confirmed_index: {},
    });
  };
  buildingIndex = async (): Promise<Uint32> => {
    return this.client.queryContractSmart(this.contractAddress, {
      building_index: {},
    });
  };
  completedIndex = async (): Promise<Uint32> => {
    return this.client.queryContractSmart(this.contractAddress, {
      completed_index: {},
    });
  };
  unhandledConfirmedIndex = async (): Promise<Uint32> => {
    return this.client.queryContractSmart(this.contractAddress, {
      unhandled_confirmed_index: {},
    });
  };
}
export interface CwBitcoinInterface extends CwBitcoinReadOnlyInterface {
  contractAddress: string;
  sender: string;
  updateBitcoinConfig: (
    {
      config,
    }: {
      config: BitcoinConfig;
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  updateCheckpointConfig: (
    {
      config,
    }: {
      config: CheckpointConfig;
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  updateHeaderConfig: (
    {
      config,
    }: {
      config: HeaderConfig;
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  relayHeaders: (
    {
      headers,
    }: {
      headers: WrappedHeader[];
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  relayDeposit: (
    {
      btcHeight,
      btcProof,
      btcTx,
      btcVout,
      dest,
      sigsetIndex,
    }: {
      btcHeight: number;
      btcProof: Binary;
      btcTx: Binary;
      btcVout: number;
      dest: Dest;
      sigsetIndex: number;
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  relayCheckpoint: (
    {
      btcHeight,
      btcProof,
      cpIndex,
    }: {
      btcHeight: number;
      btcProof: Binary;
      cpIndex: number;
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  withdrawToBitcoin: (
    {
      scriptPubkey,
    }: {
      scriptPubkey: Binary;
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  submitCheckpointSignature: (
    {
      btcHeight,
      checkpointIndex,
      sigs,
      xpub,
    }: {
      btcHeight: number;
      checkpointIndex: number;
      sigs: Signature[];
      xpub: HexBinary;
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  submitRecoverySignature: (
    {
      sigs,
      xpub,
    }: {
      sigs: Signature[];
      xpub: HexBinary;
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  setSignatoryKey: (
    {
      xpub,
    }: {
      xpub: HexBinary;
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  addValidators: (
    {
      addrs,
      infos,
    }: {
      addrs: string[];
      infos: number[][];
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  registerDenom: (
    {
      metadata,
      subdenom,
    }: {
      metadata?: Metadata;
      subdenom: string;
    },
    _fee?: number | StdFee | "auto",
    _memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
}
export class CwBitcoinClient
  extends CwBitcoinQueryClient
  implements CwBitcoinInterface
{
  client: SigningCosmWasmClient;
  sender: string;
  contractAddress: string;

  constructor(
    client: SigningCosmWasmClient,
    sender: string,
    contractAddress: string
  ) {
    super(client, contractAddress);
    this.client = client;
    this.sender = sender;
    this.contractAddress = contractAddress;
    this.updateBitcoinConfig = this.updateBitcoinConfig.bind(this);
    this.updateCheckpointConfig = this.updateCheckpointConfig.bind(this);
    this.updateHeaderConfig = this.updateHeaderConfig.bind(this);
    this.relayHeaders = this.relayHeaders.bind(this);
    this.relayDeposit = this.relayDeposit.bind(this);
    this.relayCheckpoint = this.relayCheckpoint.bind(this);
    this.withdrawToBitcoin = this.withdrawToBitcoin.bind(this);
    this.submitCheckpointSignature = this.submitCheckpointSignature.bind(this);
    this.submitRecoverySignature = this.submitRecoverySignature.bind(this);
    this.setSignatoryKey = this.setSignatoryKey.bind(this);
    this.addValidators = this.addValidators.bind(this);
    this.registerDenom = this.registerDenom.bind(this);
  }

  updateBitcoinConfig = async (
    {
      config,
    }: {
      config: BitcoinConfig;
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_bitcoin_config: {
          config,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  updateCheckpointConfig = async (
    {
      config,
    }: {
      config: CheckpointConfig;
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_checkpoint_config: {
          config,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  updateHeaderConfig = async (
    {
      config,
    }: {
      config: HeaderConfig;
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_header_config: {
          config,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  relayHeaders = async (
    {
      headers,
    }: {
      headers: WrappedHeader[];
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        relay_headers: {
          headers,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  relayDeposit = async (
    {
      btcHeight,
      btcProof,
      btcTx,
      btcVout,
      dest,
      sigsetIndex,
    }: {
      btcHeight: number;
      btcProof: Binary;
      btcTx: Binary;
      btcVout: number;
      dest: Dest;
      sigsetIndex: number;
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        relay_deposit: {
          btc_height: btcHeight,
          btc_proof: btcProof,
          btc_tx: btcTx,
          btc_vout: btcVout,
          dest,
          sigset_index: sigsetIndex,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  relayCheckpoint = async (
    {
      btcHeight,
      btcProof,
      cpIndex,
    }: {
      btcHeight: number;
      btcProof: Binary;
      cpIndex: number;
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        relay_checkpoint: {
          btc_height: btcHeight,
          btc_proof: btcProof,
          cp_index: cpIndex,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  withdrawToBitcoin = async (
    {
      scriptPubkey,
    }: {
      scriptPubkey: Binary;
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        withdraw_to_bitcoin: {
          script_pubkey: scriptPubkey,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  submitCheckpointSignature = async (
    {
      btcHeight,
      checkpointIndex,
      sigs,
      xpub,
    }: {
      btcHeight: number;
      checkpointIndex: number;
      sigs: Signature[];
      xpub: HexBinary;
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        submit_checkpoint_signature: {
          btc_height: btcHeight,
          checkpoint_index: checkpointIndex,
          sigs,
          xpub,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  submitRecoverySignature = async (
    {
      sigs,
      xpub,
    }: {
      sigs: Signature[];
      xpub: HexBinary;
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        submit_recovery_signature: {
          sigs,
          xpub,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  setSignatoryKey = async (
    {
      xpub,
    }: {
      xpub: HexBinary;
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        set_signatory_key: {
          xpub,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  addValidators = async (
    {
      addrs,
      infos,
    }: {
      addrs: string[];
      infos: number[][];
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        add_validators: {
          addrs,
          infos,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
  registerDenom = async (
    {
      metadata,
      subdenom,
    }: {
      metadata?: Metadata;
      subdenom: string;
    },
    _fee: number | StdFee | "auto" = "auto",
    _memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        register_denom: {
          metadata,
          subdenom,
        },
      },
      _fee,
      _memo,
      _funds
    );
  };
}
