import express from "express";
import bitcoinController from "../controllers/bitcoin.controller";
const router = express.Router();

router.get("/config", bitcoinController.getConfig);
router.get("/pending_deposits", bitcoinController.getPendingDeposits);
router.post("/deposit", bitcoinController.submitDepositAddress);
router.get("/value_locked", bitcoinController.getValueLocked);
router.get("/checkpoint_queue", bitcoinController.getCheckpointQueue);

export default router;
