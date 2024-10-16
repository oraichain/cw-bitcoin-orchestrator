export const RELAY_HEADER_BATCH_SIZE = 100;
export const SCAN_MEMPOOL_CHUNK_SIZE = 500;
export const SCAN_MEMPOOL_CHUNK_INTERVAL_DELAY = 250;
export const SCAN_BLOCKS_CHUNK_SIZE = 100;
export const SCAN_BLOCK_TXS_INTERVAL_DELAY = 100;
export const SUBMIT_RELAY_RECOVERY_TX_INTERVAL_DELAY = 100;
export const SUBMIT_RELAY_CHECKPOINT_INTERVAL_DELAY = 100;
export const RELAY_DEPOSIT_BLOCKS_SIZE = 1100; // 500 blocks
export const RETRY_DELAY = 100; // 1 second
export const ITERATION_DELAY = {
  // RELAY_HEADER_BATCH_DELAY: 50,
  // RELAY_HEADER_INTERVAL: 100,
  // RELAY_DEPOSIT_INTERVAL: 30,
  // RELAY_RECOVERY_INTERVAL: 30,
  // RELAY_CHECKPOINT_INTERVAL: 50,
  // RELAY_CHECKPOINT_CONF_INTERVAL: 100,
  RELAY_SIGNATURES_INTERVAL: 100,
  TRACK_MEMORY_LEAK: 10000,
};
