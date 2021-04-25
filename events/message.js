module.exports = (client, message) => {
  if (message.author.bot) return;

  if (message.guild && message.guild.id == '739493918558781490') {
    if (message.content.indexOf(client.config.rudymfPrefix) !== 0) return;
  } else {
    if (message.content.indexOf(client.config.prefix) !== 0) return;
  }

  const args = message.content.slice(client.config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  const cmd = client.commands.get(command);

  if (!cmd) return;

  console.log('User:', message.author.id);

  if (command == 'login') {
    console.log(`Command: !login ${args[0]}`);
  } else {
    console.log(`Command: ${message.content}`);
  }

  cmd.run(client, message, args);
};
