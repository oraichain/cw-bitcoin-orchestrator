import express, { Router } from 'express';
import RelayerService from '../../services/relayer';
import BitcoinController from '../controllers/bitcoin.controller';
const router: Router = express.Router();

export default (relayer: RelayerService) => {
  const bitcoinController = new BitcoinController(relayer);
  router.get('/config', bitcoinController.getConfig);
  router.get('/pending_deposits', bitcoinController.getPendingDeposits);
  router.post('/deposit', bitcoinController.submitDepositAddress);
  router.get('/value_locked', bitcoinController.getValueLocked);
  router.get('/checkpoint_queue', bitcoinController.getCheckpointQueue);

  return router;
};
