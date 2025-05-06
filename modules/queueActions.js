// appQueueClientSync.js
import request from "sync-request";


const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzr3VYUVFLNHYQLIu65nYlZucCZczHl6NH6-s0SWU8WBUPyZSJ4YTcgMATB66uDMc9Uhw/exec";

/**
 * Llama síncrono y parsea JSON.
 */
function callApiSync(action, data = null) {
  const res = request("POST", SCRIPT_URL, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`HTTP error ${res.statusCode}`);
  }


  var body = JSON.parse(res.getBody("utf8"));
// console.log(body)
  // parseamos el JSON que devuelve el Apps Script
  return body ;
}

function resetQueue() {
  return callApiSync("reset");
}

function getQueue() {
  return callApiSync("get");
}

function addCard(card) {
  return callApiSync("add", card);
}

function deleteFromQueue(card) {
  return callApiSync("delete", card);
}

export {
  resetQueue,
  getQueue,
  addCard,
  deleteFromQueue,
};
