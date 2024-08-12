import express from "express";
import checkpointController from "../controllers/checkpoint.controller";
const router = express.Router();

router.get("/", checkpointController.getCheckpoint);

export default router;
