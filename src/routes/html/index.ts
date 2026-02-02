import { Router } from 'express';
import urlToHtml from './url-to-html';
import urlToMarkdown from './url-to-markdown';

const router = Router();

router.use('/url-to-html', urlToHtml);
router.use('/url-to-markdown', urlToMarkdown);

export default router;
