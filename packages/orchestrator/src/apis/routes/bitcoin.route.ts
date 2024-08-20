import express from "express";
import bitcoinController from "../controllers/bitcoin.controller";
const router = express.Router();

router.get("/config", bitcoinController.getConfig);
router.get("/pending_deposits", bitcoinController.getPendingDeposits);
router.post("/deposit", bitcoinController.submitDepositAddress);

export default router;
