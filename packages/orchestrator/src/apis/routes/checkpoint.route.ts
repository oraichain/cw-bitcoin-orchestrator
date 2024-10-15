import express, { Router } from "express";
import checkpointController from "../controllers/checkpoint.controller";
const router: Router = express.Router();

router.get("/", checkpointController.getCheckpoint);
router.get("/config", checkpointController.getConfig);
router.get("/deposit_fee", checkpointController.getDepositFee);
router.get("/withdraw_fee", checkpointController.getWithdrawFee);
router.get("/checkpoint_fee", checkpointController.getCheckpointFee);

export default router;
