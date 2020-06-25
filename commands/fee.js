const Money = require('js-money');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  let num = Money.fromDecimal(parseInt(message.content.slice(5)), 'USD');

  let StockXFee1 = num.multiply(0.095);
  let StockXFee2 = num.multiply(0.09, Math.ceil);
  let StockXFee3 = num.multiply(0.085, Math.ceil);
  let StockXFee4 = num.multiply(0.08, Math.ceil);

  let StockXFeeTransfer = num.multiply(0.03, Math.ceil);

  StockXFee1 = StockXFee1.add(StockXFeeTransfer);
  StockXFee2 = StockXFee2.add(StockXFeeTransfer);
  StockXFee3 = StockXFee3.add(StockXFeeTransfer);
  StockXFee4 = StockXFee4.add(StockXFeeTransfer);

  let StockXRevenue1 = num.subtract(StockXFee1, Math.ceil);
  let StockXRevenue2 = num.subtract(StockXFee2, Math.ceil);
  let StockXRevenue3 = num.subtract(StockXFee3, Math.ceil);
  let StockXRevenue4 = num.subtract(StockXFee4, Math.ceil);

  let GoatFee1 = num.multiply(0.095, Math.ceil);
  GoatFee1 = GoatFee1.add(new Money(500, Money.USD));
  let GoatFee2 = num.subtract(GoatFee1, Math.ceil);
  GoatFee2 = GoatFee2.multiply(0.029, Math.ceil);
  GoatFee1 = GoatFee1.add(GoatFee2, Math.ceil);
  let GoatRevenue = num.subtract(GoatFee1, Math.ceil);

  let SGFee = num.multiply(0.2, Math.ceil);
  let SGRevenue = num.subtract(SGFee, Math.ceil);

  const embed = new Discord.MessageEmbed()
    .setTitle(`Fee for $${num}`)
    .setColor(16777214)
    .addField('Marketplace', 'StockX Level 1', true)
    .addField('Fee', `$${StockXFee1}`, true)
    .addField('Revenue', `$${StockXRevenue1}`, true)
    .addField('Marketplace', 'StockX Level 2', true)
    .addField('Fee', `$${StockXFee2}`, true)
    .addField('Revenue', `$${StockXRevenue2}`, true)
    .addField('Marketplace', 'StockX Level 3', true)
    .addField('Fee', `$${StockXFee3}`, true)
    .addField('Revenue', `$${StockXRevenue3}`, true)
    .addField('Marketplace', 'StockX Level 4', true)
    .addField('Fee', `$${StockXFee4}`, true)
    .addField('Revenue', `$${StockXRevenue4}`, true)
    .addField('Marketplace', 'Goat', true)
    .addField('Fee', `$${GoatFee1}`, true)
    .addField('Revenue', `$${GoatRevenue}`, true)
    .addField('Marketplace', 'Stadium Goods', true)
    .addField('Fee', `$${SGFee}`, true)
    .addField('Revenue', `$${SGRevenue}`, true);

  message.channel.send({ embed }).then(console.log(`${message} completed`));
};
