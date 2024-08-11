import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import bitcoinService from "../services/bitcoin.service";

const getPendingDeposits = catchAsync(async (req: Request, res: Response) => {
  const { address } = req.query;
  const data = await bitcoinService.getPendingDeposits(address as string);
  res.status(httpStatus.OK).json({
    message: "Get pending deposits successfully",
    data,
  });
});

const getDepositAddress = catchAsync(async (req: Request, res: Response) => {
  const { address } = req.params;
  const data = await bitcoinService.getDepositAddress(address as string);
  res.status(httpStatus.OK).json({
    message: "Get deposit address successfully",
    data,
  });
});

export default { getPendingDeposits, getDepositAddress };
