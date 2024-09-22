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
  .command("start", "Start the orchestrator", async () => {
    // lazy-import orchestrator to activate env config
    const { default: orchestratorCmd } = await import("./bin/start");
    await orchestratorCmd();
  })
  .option("help", {
    alias: "h",
    demandOption: false,
  })
  .parse();
