import express from "express";
import checkpointController from "../controllers/checkpoint.controller";
const router = express.Router();

router.get("/", checkpointController.getCheckpoint);
router.get("/config", checkpointController.getConfig);
router.get("/deposit_fee", checkpointController.getDepositFee);
router.get("/withdraw_fee", checkpointController.getWithdrawFee);
router.get("/checkpoint_fee", checkpointController.getCheckpointFee);
router.get(
  "/store_checkpoint_indexes",
  checkpointController.getStoreCheckpointIndexes
);

export default router;
