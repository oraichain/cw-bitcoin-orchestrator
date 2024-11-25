import { AppBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import express, { Router } from "express";
import ContractController from "../controllers/contract.controller";
const router: Router = express.Router();

export default (appBitcoinQueryClient: AppBitcoinQueryClient) => {
  const contractController = new ContractController(appBitcoinQueryClient);
  router.get("/config", contractController.getConfig);
  return router;
};
