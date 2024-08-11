import express from "express";
import bitcoinController from "../controllers/bitcoin.controller";
const router = express.Router();

router.get("/pending_deposits", bitcoinController.getPendingDeposits);
router.get("/deposit", bitcoinController.getDepositAddress);

export default router;
