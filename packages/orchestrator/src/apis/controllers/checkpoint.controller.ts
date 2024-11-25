import { AppBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import CheckpointService from "../services/checkpoint.service";

class CheckpointController {
  protected checkpointService: CheckpointService;

  constructor(protected readonly appBitcoinQueryClient: AppBitcoinQueryClient) {
    this.checkpointService = new CheckpointService(appBitcoinQueryClient);
  }

  getConfig = catchAsync(async (req: Request, res: Response) => {
    const data = await this.checkpointService.getConfig();
    res.status(httpStatus.OK).json({
      message: "Get checkpoint config successfully",
      data,
    });
  });

  getCheckpoint = catchAsync(async (req: Request, res: Response) => {
    const { index } = req.query;
    const data = await this.checkpointService.getCheckpoint(
      index ? parseInt(index as string) : undefined
    );
    res.status(httpStatus.OK).json({
      message: "Get checkpoint successfully",
      data,
    });
  });

  getDepositFee = catchAsync(async (req: Request, res: Response) => {
    const { index } = req.query;
    const data = await this.checkpointService.getDepositFee(
      index ? parseInt(index as string) : undefined
    );
    res.status(httpStatus.OK).json({
      message: "Get deposit fee successfully",
      data,
    });
  });

  getWithdrawFee = catchAsync(async (req: Request, res: Response) => {
    const { index, address } = req.query;
    const data = await this.checkpointService.getWithdrawFee(
      index ? parseInt(index as string) : undefined,
      address as string
    );
    res.status(httpStatus.OK).json({
      message: "Get withdraw fee successfully",
      data,
    });
  });

  getCheckpointFee = catchAsync(async (req: Request, res: Response) => {
    const { index } = req.query;
    const data = await this.checkpointService.getCheckpointFee(
      index ? parseInt(index as string) : undefined
    );
    res.status(httpStatus.OK).json({
      message: "Get checkpoint fee successfully",
      data,
    });
  });
}

export default CheckpointController;
