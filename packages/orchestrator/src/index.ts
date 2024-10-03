#!/usr/bin/env -S node --no-warnings

import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

yargs(hideBin(process.argv))
  .scriptName("bitcoin-orchestrator")
  .config("env", (path) => {
    return dotenv.config({ path });
  })
  .default("env", ".env")
  .command("check", "Check signer role", async () => {
    // lazy-import orchestrator to activate env config
    const { default: checkCmd } = await import("./bin/check");
    await checkCmd();
  })
  .command("register", "Register to be a validator", async () => {
    // lazy-import orchestrator to activate env config
    const { default: registerCmd } = await import("./bin/register");
    await registerCmd();
  })
  .command("relayer", "Relaying packets on bitcoin", async () => {
    // lazy-import orchestrator to activate env config
    const { default: relayerCmd } = await import("./bin/relayer");
    await relayerCmd();
  })
  .command("signer", "Signing txs on bitcoin", async () => {
    // lazy-import orchestrator to activate env config
    const { default: signerCmd } = await import("./bin/signer");
    await signerCmd();
  })
  .command("trigger-block", "Trigger new blocks on bitcoin", async () => {
    // lazy-import orchestrator to activate env config
    const { default: triggerBlockCmd } = await import("./bin/trigger_block");
    await triggerBlockCmd();
  })
  .command(
    "submit-deposit-address",
    "Submit deposit address",
    (yargs) => {
      return yargs
        .option("oraiAddress", {
          type: "string",
          describe: "Oraichain wallet address",
          demandOption: true,
        })
        .option("depositAddress", {
          type: "string",
          describe: "Deposit address to submit",
          demandOption: true,
        })
        .option("sigsetIndex", {
          type: "number",
          describe: "Sigset index associated with the deposit",
          demandOption: true,
        });
    },
    async (argvs) => {
      const { oraiAddress, depositAddress, sigsetIndex } = argvs;
      const { default: submitDepositAddressCmd } = await import(
        "./bin/submit_deposit_address"
      );
      await submitDepositAddressCmd(oraiAddress, depositAddress, sigsetIndex);
    }
  )
  .option("help", {
    alias: "h",
    demandOption: false,
  })
  .parse();
