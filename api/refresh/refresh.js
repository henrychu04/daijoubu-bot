const webhook = require('./webhook.js');
const Monitor = require('./monitor.js');

module.exports = async (client) => {
  const newMonitor = new Monitor(client);

  console.log('Monitoring users ...\n');

  newMonitor.on('newUpdate', (obj) => {
    for (let crnt of obj.newUpdate) {
      webhook(client, obj.returningUser, crnt.title, crnt.body);
    }
  });
};
