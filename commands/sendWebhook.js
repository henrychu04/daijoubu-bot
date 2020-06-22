const fetch = require('node-fetch');
const config = require('../config');

module.exports = async function sendWebhook(embeded) {
  await fetch(config.webhookURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(embeded),
  }).catch((err) => {
    throw new Error();
  });
};
