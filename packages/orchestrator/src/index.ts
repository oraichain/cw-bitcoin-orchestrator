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
  .command("start", "Start the orchestrator", async () => {
    // lazy-import orchestrator to activate env config
    const { default: orchestratorCmd } = await import("./orchestrator");
    await orchestratorCmd();
  })
  .option("help", {
    alias: "h",
    demandOption: false,
  })
  .parse();
