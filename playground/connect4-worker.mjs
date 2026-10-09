import { createBoard, chooseMove } from './connect4.mjs';

export function handleSearch(message) {
  const requestId = message?.requestId;
  try {
    if (message?.type !== 'search' || !Array.isArray(message.moves)) throw new TypeError('Expected a search request with a move history.');
    return { type: 'result', requestId, result: chooseMove(createBoard(message.moves), message.options) };
  } catch (error) {
    return { type: 'error', requestId, error: error.message };
  }
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof document === 'undefined') {
  self.onmessage = event => self.postMessage(handleSearch(event.data));
}
