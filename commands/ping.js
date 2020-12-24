exports.run = (client, message, args) => {
  message.channel
    .send('Pinging ...')
    .then((sent) => {
      sent.edit(`Pong! Took ${sent.createdTimestamp - message.createdTimestamp}ms`);
    })
    .catch(console.error);
};
