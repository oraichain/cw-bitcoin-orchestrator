import express from "express";
import checkpointController from "../controllers/checkpoint.controller";
const router = express.Router();

router.get("/", checkpointController.getCheckpoint);
router.get("/deposit_fee", checkpointController.getDepositFee);
router.get("/withdraw_fee", checkpointController.getWithdrawFee);
router.get("/checkpoint_fee", checkpointController.getCheckpointFee);

export default router;
