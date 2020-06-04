const fetch = require('node-fetch');
require('dotenv').config();

module.exports = async function sendWebhook(embeded) {
  await fetch(process.env.BOT_TOOLS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(embeded),
  }).catch((err) => {
    throw new Error();
  });
};
