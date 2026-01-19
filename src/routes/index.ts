import { Router } from 'express';
import healthRouter from './health';
import pdfRouter from './pdf';

const router = Router();

router.use('/health', healthRouter);
router.use('/pdf', pdfRouter);

export default router;
