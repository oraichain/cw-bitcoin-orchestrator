import express from "express";
import contractController from "../controllers/contract.controller";
const router = express.Router();

router.get("/config", contractController.getConfig);

export default router;
