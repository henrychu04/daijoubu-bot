const fetch = require('node-fetch');

async function sendOTP(client, loginToken) {
  let otpRes = 0;
  let count = 0;

  while (otpRes != 200) {
    otpRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/send-otp', {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{}`,
    }).then((res, err) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else if (res.status != 200) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  return otpRes;
}

async function verifyOTP(client, loginToken, num) {
  let otpRes = 0;
  let count = 0;

  while (otpRes != 200) {
    otpRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/verify-otp', {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"oneTimePassword":"${num}"}`,
    }).then((res, err) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else if (res.status != 200 && res.status != 400) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  return otpRes;
}

async function getPhone(client, loginToken) {
  let phone = null;
  let phoneRes = 0;
  let count = 0;

  while (phoneRes != 200) {
    phone = await fetch('https://sell-api.goat.com/api/v1/unstable/users/me', {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: '{}',
    }).then((res, err) => {
      phoneRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  return phone;
}

async function getFee(client, loginToken, amount) {
  let fee = null;
  let feeRes = 0;
  let count = 0;

  while (feeRes != 200) {
    fee = await fetch(`https://sell-api.goat.com/api/v1/users/cashout-breakdown`, {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"cashoutAmountCents":"${amount}"}`,
    }).then((res, err) => {
      feeRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  return fee;
}

async function cashOut(client, loginToken, amount) {
  let cashOut = null;
  let cashOutRes = 0;
  let count = 0;

  while (cashOutRes != 200) {
    cashOut = await fetch('https://sell-api.goat.com/api/v1/users/cashout', {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"cashOutCents":"${amount}"}`,
    }).then((res, err) => {
      cashOutRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  return cashOut;
}

module.exports = { sendOTP, verifyOTP, getPhone, getFee, cashOut };
