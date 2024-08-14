import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import checkpointService from "../services/checkpoint.service";

const getCheckpoint = catchAsync(async (req: Request, res: Response) => {
  const { index } = req.query;
  const data = await checkpointService.getCheckpoint(
    index ? parseInt(index as string) : undefined
  );
  res.status(httpStatus.OK).json({
    message: "Get checkpoint successfully",
    data,
  });
});

const getDepositFee = catchAsync(async (req: Request, res: Response) => {
  const { index } = req.query;
  const data = await checkpointService.getDepositFee(
    index ? parseInt(index as string) : undefined
  );
  res.status(httpStatus.OK).json({
    message: "Get deposit fee successfully",
    data,
  });
});

const getWithdrawFee = catchAsync(async (req: Request, res: Response) => {
  const { index, address } = req.query;
  const data = await checkpointService.getWithdrawFee(
    index ? parseInt(index as string) : undefined,
    address as string
  );
  res.status(httpStatus.OK).json({
    message: "Get withdraw fee successfully",
    data,
  });
});

const getCheckpointFee = catchAsync(async (req: Request, res: Response) => {
  const { index } = req.query;
  const data = await checkpointService.getCheckpointFee(
    index ? parseInt(index as string) : undefined
  );
  res.status(httpStatus.OK).json({
    message: "Get checkpoint fee successfully",
    data,
  });
});

const getStoreCheckpointIndexes = catchAsync(
  async (req: Request, res: Response) => {
    const data = await checkpointService.getStoreCheckpointIndexes();
    res.status(httpStatus.OK).json({
      message: "Get completed index successfully",
      data,
    });
  }
);

export default {
  getCheckpoint,
  getDepositFee,
  getWithdrawFee,
  getCheckpointFee,
  getStoreCheckpointIndexes,
};
