exports.run = (client, message, args) => {
  message.channel
    .send('Pinging ...')
    .then((sent) => {
      sent.edit(`Pong! Took ${sent.createdTimestamp - message.createdTimestamp}ms`);
    })
    .then(console.log('!ping completed\n'))
    .catch(console.error);
};
