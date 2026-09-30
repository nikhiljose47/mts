import { Router } from 'express';
import { quoteHandler } from './handlers/angel/quote.handler';
import { candlesHandler } from './handlers/angel/candles.handler';
import { chatStreamHandler } from './handlers/chat-stream.handler';
import { extractHandler } from './handlers/extract.handler';

export const apiRouter = Router();

apiRouter.get('/angel/quote', quoteHandler);
apiRouter.get('/angel/candles', candlesHandler);
apiRouter.post('/chat/stream', chatStreamHandler);
apiRouter.post('/extract', extractHandler);
