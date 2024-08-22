import { Dest } from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import bitcoinService from "../services/bitcoin.service";

const getConfig = catchAsync(async (req: Request, res: Response) => {
  const data = await bitcoinService.getConfig();
  res.status(httpStatus.OK).json({
    message: "Get bitcoin config successfully",
    data,
  });
});

const getPendingDeposits = catchAsync(async (req: Request, res: Response) => {
  const { address } = req.query;
  const data = await bitcoinService.getPendingDeposits(address as string);
  res.status(httpStatus.OK).json({
    message: "Get pending deposits successfully",
    data,
  });
});

const submitDepositAddress = catchAsync(async (req: Request, res: Response) => {
  const { deposit_addr: depositAddr, sigset_index: sigsetIndex } = req.query;
  const { dest } = req.body;
  const data = await bitcoinService.submitDepositAddress(
    depositAddr as string,
    parseInt(sigsetIndex as string),
    dest as Dest
  );
  res.status(httpStatus.OK).json({
    message: "Get deposit address successfully",
    data,
  });
});

const getValueLocked = catchAsync(async (req: Request, res: Response) => {
  const data = await bitcoinService.getValueLocked();
  res.status(httpStatus.OK).json({
    message: "Get value locked successfully",
    data,
  });
});

export default {
  getConfig,
  getPendingDeposits,
  submitDepositAddress,
  getValueLocked,
};
