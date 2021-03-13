const webhook = require('./webhook.js');
const Monitor = require('./monitor.js');

module.exports = async (client) => {
  const newMonitor = new Monitor(client);

  console.log('Monitoring users ...\n');

  newMonitor.on('newUpdate', (newUpdate, type, user) => {
    console.log(`New update is ${type}`);
    for (let crnt of newUpdate) {
      webhook(client, user, crnt.title, crnt.body);
    }
  });
};
