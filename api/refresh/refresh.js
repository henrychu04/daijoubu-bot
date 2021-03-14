const webhook = require('./webhook.js');
const Monitor = require('./monitor.js');

module.exports = async (client) => {
  const monitor = new Monitor(client);

  console.log('Monitoring users ...\n');

  monitor.on('newUpdate', (newUpdate) => {
    let { data, user, type } = newUpdate;

    console.log(`Event type: ${type}`);
    
    for (let crnt of data) {
      webhook(client, user, crnt.title, crnt.body);
    }
  });
};
