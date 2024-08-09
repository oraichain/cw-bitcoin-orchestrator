import "dotenv/config";
import Joi from "joi";

const envVarsSchema = Joi.object()
  .keys({
    MNEMONIC: Joi.string().error(new Error("MNEMONIC is required")),
    BTC_RPC_PORT: Joi.number().default(3000),
    BTC_RPC_HOST: Joi.string().default("http://127.0.0.1"),
    BTC_RPC_USERNAME: Joi.string().default("satoshi"),
    BTC_RPC_PASSWORD: Joi.string().default("nakamoto"),
    COSMOS_RPC_URL: Joi.string().default("https://rpc.orai.io/"),
    CW_BITCOIN_ADDRESS: Joi.string().error(
      new Error("CW_BITCOIN_ADDRESS is required")
    ),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export default {
  bitcoin: {
    port: envVars.BTC_RPC_PORT,
    host: envVars.BTC_RPC_HOST,
    username: envVars.BTC_RPC_USERNAME,
    password: envVars.BTC_RPC_PASSWORD,
  },
  cosmos: {
    rpcUrl: envVars.COSMOS_RPC_URL,
    cwBitcoin: envVars.CW_BITCOIN_ADDRESS,
    mnemonic: envVars.MNEMONIC,
  },
};
