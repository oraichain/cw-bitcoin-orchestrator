import express, { Router } from "express";
import contractController from "../controllers/contract.controller";
const router: Router = express.Router();

router.get("/config", contractController.getConfig);

export default router;
