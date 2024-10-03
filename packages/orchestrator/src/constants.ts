export const RELAY_HEADER_BATCH_SIZE = 250;
export const SCAN_MEMPOOL_CHUNK_SIZE = 1000;
export const SCAN_MEMPOOL_CHUNK_INTERVAL_DELAY = 100;
export const RELAY_DEPOSIT_BLOCKS_SIZE = 200; // 10 blocks
export const RETRY_DELAY = 1000; // 1 second
export const ITERATION_DELAY = {
  RELAY_HEADER_BATCH_DELAY: 500,
  RELAY_HEADER_INTERVAL: 10000,
  RELAY_DEPOSIT_INTERVAL: 3000,
  RELAY_RECOVERY_INTERVAL: 3000,
  RELAY_CHECKPOINT_INTERVAL: 5000,
  RELAY_CHECKPOINT_CONF_INTERVAL: 10000,
  RELAY_SIGNATURES_INTERVAL: 10000,
};
