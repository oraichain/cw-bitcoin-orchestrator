import { Dest } from '@oraichain/bitcoin-bridge-contracts-sdk/build/CwBitcoin.types';
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import RelayerService from '../../services/relayer';
import { catchAsync } from '../../utils/catchAsync';
import bitcoinService from '../services/bitcoin.service';

export default class BitcoinController {
  constructor(private readonly relayerService: RelayerService) {}

  getConfig = catchAsync(async (req: Request, res: Response) => {
    const data = await bitcoinService.getConfig();
    res.status(httpStatus.OK).json({
      message: 'Get bitcoin config successfully',
      data
    });
  });

  getPendingDeposits = catchAsync(async (req: Request, res: Response) => {
    const { address } = req.query;
    const data = await this.relayerService.getPendingDeposits(address as string);
    res.status(httpStatus.OK).json({
      message: 'Get pending deposits successfully',
      data
    });
  });

  submitDepositAddress = catchAsync(async (req: Request, res: Response) => {
    const { deposit_addr: depositAddr, sigset_index: sigsetIndex } = req.query;
    const { dest } = req.body;
    const data = await this.relayerService.submitDepositAddress(depositAddr as string, parseInt(sigsetIndex as string), dest as Dest);
    res.status(httpStatus.OK).json({
      message: 'Get deposit address successfully',
      data
    });
  });

  getValueLocked = catchAsync(async (req: Request, res: Response) => {
    const data = await bitcoinService.getValueLocked();
    res.status(httpStatus.OK).json({
      message: 'Get value locked successfully',
      data
    });
  });

  getCheckpointQueue = catchAsync(async (req: Request, res: Response) => {
    const data = await bitcoinService.getCheckpointQueue();
    res.status(httpStatus.OK).json({
      message: 'Get checkpoint queue successfully',
      data
    });
  });
}
