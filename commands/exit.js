exports.run = async (client, message, args) => {
  let isBotOwner = message.author.id == '504000540804382741';

  if (!isBotOwner) return;

  message.channel.send('Shutting down...').then(() => {
    client.destroy();
  });
};
