const Discord = require('discord.js');
const Enmap = require('enmap');
const fs = require('fs');
const loginGoat = require('./scripts/login');
const sleep = require('./scripts/sleep');

start(() => {
  let client = new Discord.Client();
  const config = require('./config.json');
  client.config = config;

  fs.readdir('./events/', (err, files) => {
    if (err) return console.error(err);
    files.forEach((file) => {
      const event = require(`./events/${file}`);
      let eventName = file.split('.')[0];
      client.on(eventName, event.bind(null, client));
    });
  });

  client.commands = new Enmap();

  fs.readdir('./commands/', (err, files) => {
    if (err) return console.error(err);
    files.forEach((file) => {
      if (!file.endsWith('.js')) return;
      let props = require(`./commands/${file}`);
      let commandName = file.split('.')[0];
      client.commands.set(commandName, props);
    });
  });

  client.on('ready', async () => {
    client.user.setActivity('!help for more info');
  });

  client.login(client.config.botToken).then(console.log('Ready!'));
});

async function start(callback) {
  await loginGoat().then(console.log('Logged into GOAT'));
  await sleep(1000);

  callback();
}
