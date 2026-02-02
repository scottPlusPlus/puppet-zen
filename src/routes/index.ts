import { Router } from 'express';
import healthRouter from './health';
import pdfRouter from './pdf';
import htmlRouter from './html';
import scraperRouter from './scraper';

const router = Router();

router.use('/health', healthRouter);
router.use('/pdf', pdfRouter);
router.use('/html', htmlRouter);
router.use('/scraper', scraperRouter);

export default router;
