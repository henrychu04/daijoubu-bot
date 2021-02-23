const earningsReq = require('../../requests/earningsReq.js');

module.exports = async (client, user, loginToken) => {
  let earnings = await earningsReq(client, loginToken);

  let crntEarnings = 0;

  if (earnings.amount_cents) {
    crntEarnings = parseInt(earnings.amount_cents);

    if (crntEarnings != user.aliasCashoutAmount) {
      await Users.updateOne({ _id: user._id }, { $set: { aliasCashoutAmount: crntEarnings } }, async (err) => {
        if (!err) {
          console.log(`User: ${user.d_id}\nCash out database amount updated successfully\n`);
        }
      }).catch((err) => {
        throw new Error(err);
      });
    }

    if (user.aliasCashoutAmount < crntEarnings) {
      return [
        {
          title: 'Earnings',
          body:
            '```' +
            `Amount available for cash out: $${(crntEarnings / 100).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}` +
            '```',
        },
      ];
    }
  }
};
