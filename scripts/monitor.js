const refresh = require('./refresh');

module.exports = function main(client) {
  console.log('Monitoring accounts ...\n');
  refresh(client, null, null);

  setInterval(function () {
    refresh(client, null, null);
  }, 60000);
};
