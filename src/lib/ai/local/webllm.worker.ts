/// <reference lib="webworker" />
/** WebLLM engine in a worker (keeps the UI responsive while the model generates). */
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => handler.onmessage(msg);
