import { Router } from 'express';
import urlToPdf from './url-to-pdf';

const router = Router();

router.use('/url-to-pdf', urlToPdf);

export default router;
