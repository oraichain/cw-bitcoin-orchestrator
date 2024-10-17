import { AppBitcoinQueryClient } from '@oraichain/bitcoin-bridge-contracts-sdk';
import env from '../../configs/env';
import { initQueryClient } from '../../utils/cosmos';

const getConfig = async () => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new AppBitcoinQueryClient(client, env.cosmos.appBitcoin);
  return queryClient.bitcoinConfig();
};

const getValueLocked = async () => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new AppBitcoinQueryClient(client, env.cosmos.appBitcoin);
  try {
    const valueLocked = await queryClient.valueLocked();
    return valueLocked;
  } catch (err) {
    return 0;
  }
};

const getCheckpointQueue = async () => {
  const client = await initQueryClient(env.cosmos.rpcUrl);
  const queryClient = new AppBitcoinQueryClient(client, env.cosmos.appBitcoin);
  try {
    const buildingIndex = await queryClient.buildingIndex();
    const confirmedIndex = await queryClient.confirmedIndex();
    const firstUnconfirmedIndex = await queryClient.unhandledConfirmedIndex();

    return {
      index: buildingIndex,
      first_unhandled_confirmed_cp_index: firstUnconfirmedIndex,
      confirmed_index: confirmedIndex
    };
  } catch (err) {
    return {
      index: 0,
      first_unhandled_confirmed_cp_index: 0,
      confirmed_index: 0
    };
  }
};

export default {
  getConfig,
  getValueLocked,
  getCheckpointQueue
};
