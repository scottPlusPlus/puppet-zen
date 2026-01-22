import { Router } from 'express';
import urlToHtml from './url-to-html';

const router = Router();

router.use('/url-to-html', urlToHtml);

export default router;
