import { Router } from 'express';
import healthRouter from './health';
import pdfRouter from './pdf';
import htmlRouter from './html';

const router = Router();

router.use('/health', healthRouter);
router.use('/pdf', pdfRouter);
router.use('/html', htmlRouter);

export default router;
