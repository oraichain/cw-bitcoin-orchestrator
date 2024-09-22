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
  .command("trigger_block", "Trigger new blocks on bitcoin", async () => {
    // lazy-import orchestrator to activate env config
    const { default: triggerBlockCmd } = await import("./bin/trigger_block");
    await triggerBlockCmd();
  })
  .option("help", {
    alias: "h",
    demandOption: false,
  })
  .parse();
