const refresh = require('./refresh');

module.exports = function main(client) {
  refresh(client, null, null);

  setInterval(function () {
    refresh(client, null, null);
  }, 60000);
};
