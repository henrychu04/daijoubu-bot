module.exports = async (user) => {
  let newMoney = (user.aliasCashoutAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
  let crntEarnings = '$' + newMoney;
  let earningsString = 'Current Available Earnings: ' + crntEarnings;

  return { returnString: earningsString, cashoutAmount: user.aliasCashoutAmount };
};
