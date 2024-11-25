import { AppBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import ContractService from "../services/contract.service";

class ContractController {
  protected contractService: ContractService;

  constructor(protected readonly appBitcoinQueryClient: AppBitcoinQueryClient) {
    this.contractService = new ContractService(appBitcoinQueryClient);
  }

  getConfig = catchAsync(async (req: Request, res: Response) => {
    const data = await this.contractService.getConfig();
    res.status(httpStatus.OK).json({
      message: "Get contract config successfully",
      data,
    });
  });
}

export default ContractController;
