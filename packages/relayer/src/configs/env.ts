import "dotenv/config";
import Joi from "joi";

const envVarsSchema = Joi.object()
  .keys({
    RPC_PORT: Joi.number().default(3000),
    RPC_HOST: Joi.string().default("http://127.0.0.1"),
    RPC_USERNAME: Joi.string().default("satoshi"),
    RPC_PASSWORD: Joi.string().default("nakamoto"),
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
    port: envVars.RPC_PORT,
    host: envVars.RPC_HOST,
    username: envVars.RPC_USERNAME,
    password: envVars.RPC_PASSWORD,
  },
};
