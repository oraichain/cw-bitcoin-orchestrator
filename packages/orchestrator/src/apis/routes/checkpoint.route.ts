import { AppBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import express, { Router } from "express";
import CheckpointController from "../controllers/checkpoint.controller";

const router: Router = express.Router();
export default (appBitcoinQueryClient: AppBitcoinQueryClient) => {
  const checkpointController = new CheckpointController(appBitcoinQueryClient);
  router.get("/", checkpointController.getCheckpoint);
  router.get("/config", checkpointController.getConfig);
  router.get("/deposit_fee", checkpointController.getDepositFee);
  router.get("/withdraw_fee", checkpointController.getWithdrawFee);
  router.get("/checkpoint_fee", checkpointController.getCheckpointFee);
  return router;
};
