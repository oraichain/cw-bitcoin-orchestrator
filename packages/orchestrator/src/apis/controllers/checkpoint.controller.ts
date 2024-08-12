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

export default { getCheckpoint };
