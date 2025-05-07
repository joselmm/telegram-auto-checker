// appQueueClientSync.js
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const QUEUE_FILE = resolve("./queue.json");

/**
 * Ensure queue.json exists. If not, create with empty array.
 */
function ensureFile() {
  if (!existsSync(QUEUE_FILE)) {
    writeFileSync(QUEUE_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

/**
 * Load and parse queue.json
 * @returns {Array<any>}
 */
function callApiSync_loadQueue() {
  ensureFile();
  const raw = readFileSync(QUEUE_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Serialize and save queue.json
 * @param {Array<any>} queue
 */
function callApiSync_saveQueue(queue) {
  writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
}

// -----------------------------------------------------------------------------
// same API as before:

/**
 * Reset to empty queue.
 * @returns {Array<any>} the new (empty) queue
 */
function resetQueue() {
  callApiSync_saveQueue([]);
  return [];
}

/**
 * Get the current queue.
 * @returns {Array<any>}
 */
function getQueue() {
  return callApiSync_loadQueue();
}

/**
 * Add a card to the queue.
 * @param {any} card
 * @returns {Array<any>} the updated queue
 */
function addCard(card) {
  const queue = callApiSync_loadQueue();
  queue.push(card);
  callApiSync_saveQueue(queue);
  return queue;
}

/**
 * Remove the first occurrence of `card` from the queue.
 * @param {any} card
 * @returns {Array<any>} the updated queue
 */
function deleteFromQueue(card) {
  const queue = callApiSync_loadQueue();
  const idx = queue.indexOf(card);
  if (idx !== -1) {
    queue.splice(idx, 1);
    callApiSync_saveQueue(queue);
  }
  return queue;
}

export {
  resetQueue,
  getQueue,
  addCard,
  deleteFromQueue,
};
