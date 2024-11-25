import { AppBitcoinQueryClient } from "@oraichain/bitcoin-bridge-contracts-sdk";
import { Dest } from "@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types";
import { Request, Response } from "express";
import httpStatus from "http-status";
import RelayerService from "../../services/relayer";
import { catchAsync } from "../../utils/catchAsync";
import BitcoinService from "../services/bitcoin.service";

export default class BitcoinController {
  protected bitcoinService: BitcoinService;
  constructor(
    protected readonly relayerService: RelayerService,
    protected readonly appBitcoinQueryClient: AppBitcoinQueryClient
  ) {
    this.bitcoinService = new BitcoinService(appBitcoinQueryClient);
  }

  getConfig = catchAsync(async (req: Request, res: Response) => {
    const data = await this.bitcoinService.getConfig();
    res.status(httpStatus.OK).json({
      message: "Get bitcoin config successfully",
      data,
    });
  });

  getPendingDeposits = catchAsync(async (req: Request, res: Response) => {
    const { address } = req.query;
    const data = await this.relayerService.getPendingDeposits(
      address as string
    );
    res.status(httpStatus.OK).json({
      message: "Get pending deposits successfully",
      data,
    });
  });

  submitDepositAddress = catchAsync(async (req: Request, res: Response) => {
    const { deposit_addr: depositAddr, sigset_index: sigsetIndex } = req.query;
    const { dest } = req.body;
    const data = await this.relayerService.submitDepositAddress(
      depositAddr as string,
      parseInt(sigsetIndex as string),
      dest as Dest
    );
    res.status(httpStatus.OK).json({
      message: "Get deposit address successfully",
      data,
    });
  });

  getValueLocked = catchAsync(async (req: Request, res: Response) => {
    const data = await this.bitcoinService.getValueLocked();
    res.status(httpStatus.OK).json({
      message: "Get value locked successfully",
      data,
    });
  });

  getCheckpointQueue = catchAsync(async (req: Request, res: Response) => {
    const data = await this.bitcoinService.getCheckpointQueue();
    res.status(httpStatus.OK).json({
      message: "Get checkpoint queue successfully",
      data,
    });
  });
}
