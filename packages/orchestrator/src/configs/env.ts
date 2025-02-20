import Joi from "joi";

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().error(new Error("NODE_ENV is required")),
    PORT: Joi.number().default(8000),
    ENCRYPTED_MNEMONIC: Joi.string().optional(),
    MNEMONIC: Joi.string().optional(),
    BTC_RPC_PORT: Joi.number().default(3000),
    BTC_RPC_HOST: Joi.string().default("http://127.0.0.1"),
    BTC_RPC_USERNAME: Joi.string().default("satoshi"),
    BTC_RPC_PASSWORD: Joi.string().default("nakamoto"),
    BTC_NETWORK: Joi.string().default("testnet"),
    COSMOS_RPC_URL: Joi.optional().default("https://rpc.orai.io"),
    COSMOS_LCD_URL: Joi.optional().default("https://lcd.orai.io"),
    LIGHT_CLIENT_BITCOIN_ADDRESS: Joi.string().error(
      new Error("LIGHT_CLIENT_BITCOIN_ADDRESS is required")
    ),
    APP_BITCOIN_ADDRESS: Joi.string().error(
      new Error("APP_BITCOIN_ADDRESS is required")
    ),
    DUCKDB_DIR_NAME: Joi.string().default("db.duckdb"),
    MAX_WITHDRAWAL_RATE: Joi.number().default(0.1),
    SIGSET_CHANGE_RATE: Joi.number().default(0.1),
    MIN_BLOCKS_PER_CHECKPOINT: Joi.number().default(6),
    LEGITIMATE_CHECKPOINT_INTERVAL: Joi.number().default(24 * 60 * 60),
    DEPOSIT_BUFFER: Joi.number().error(new Error("DEPOSIT_BUFFER is required")),
    STORAGE_DIR_NAME: Joi.string().default(".oraibtc-relayer"),
    WEBHOOK_URL: Joi.string().allow("").optional(),
    TRIGGER_BLOCK_INTERVAL: Joi.number().default(5 * 60 * 1000),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export default {
  server: {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    storageDirName: envVars.STORAGE_DIR_NAME,
  },
  bitcoin: {
    port: envVars.BTC_RPC_PORT,
    host: envVars.BTC_RPC_HOST,
    username: envVars.BTC_RPC_USERNAME,
    password: envVars.BTC_RPC_PASSWORD,
    network: envVars.BTC_NETWORK,
  },
  cosmos: {
    rpcUrl: envVars.COSMOS_RPC_URL,
    encryptedMnemonic: envVars.ENCRYPTED_MNEMONIC,
    mnemonic: envVars.MNEMONIC,
    appBitcoin: envVars.APP_BITCOIN_ADDRESS,
    lightClientBitcoin: envVars.LIGHT_CLIENT_BITCOIN_ADDRESS,
  },
  duckdb: {
    name: envVars.DUCKDB_DIR_NAME,
  },
  signer: {
    maxWithdrawalRate: envVars.MAX_WITHDRAWAL_RATE,
    sigsetChangeRate: envVars.SIGSET_CHANGE_RATE,
    minBlocksPerCheckpoint: envVars.MIN_BLOCKS_PER_CHECKPOINT,
    legitimateCheckpointInterval: envVars.LEGITIMATE_CHECKPOINT_INTERVAL,
  },
  deposit: {
    depositBuffer: envVars.DEPOSIT_BUFFER,
  },
  triggerBlockInterval: envVars.TRIGGER_BLOCK_INTERVAL,
  logger: {
    webhookUrl: envVars.WEBHOOK_URL,
  },
};
