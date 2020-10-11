const CronJob = require('cron').CronJob;
const refresh = require('./refresh');

module.exports = function main(client) {
  try {
    let job = new CronJob('* * * * *', function () {
      refresh(client, null, null);
    });

    job.start();
  } catch (err) {
    console.log(err);
  }
};
