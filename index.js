const Discord = require('discord.js');
const Enmap = require('enmap');
const fs = require('fs');
const loginGoat = require('./scripts/login');
const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.URI;

let client = new Discord.Client();
const config = require('./config.json');
client.config = config;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }).then(console.log('Connected to MongoDB'));

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

client.login(process.env.BOT_TOKEN).then(loginGoat()).then(console.log('Ready!'));
