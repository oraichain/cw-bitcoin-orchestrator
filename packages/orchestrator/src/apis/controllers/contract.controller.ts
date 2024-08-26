import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import contractService from "../services/bitcoin.service";

const getConfig = catchAsync(async (req: Request, res: Response) => {
  const data = await contractService.getConfig();
  res.status(httpStatus.OK).json({
    message: "Get bitcoin config successfully",
    data,
  });
});

export default {
  getConfig,
};
