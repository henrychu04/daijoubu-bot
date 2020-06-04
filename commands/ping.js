exports.run = (client, message, args) => {
  message.channel
    .send('pong!')
    .then(console.log(`${message} completed`))
    .catch(console.error);
};
