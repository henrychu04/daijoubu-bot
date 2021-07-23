const aliasCommands = require('./aliasCommands.js');

module.exports = class aliasClass {
  constructor(client, user, loginToken, message) {
    this.client = client;
    this.user = user;
    this.loginToken = loginToken;
    this.message = message;
  }

  async login(email, pw) {
    await aliasCommands.aliasLogin(this.client, this.message, email, pw);
  }

  async check() {
    return await aliasCommands.check(this.user);
  }

  async match() {
    return await aliasCommands.match(this.client, this.loginToken, this.user, this.message);
  }

  async mongoListings() {
    return await aliasCommands.mongoListings(this.user);
  }

  async delete() {
    return await aliasCommands.deleteReq(this.client, this.loginToken, this.user, this.message);
  }

  async edit() {
    return await aliasCommands.edit(this.client, this.loginToken, this.user, this.message);
  }

  async getOrders() {
    return await aliasCommands.getOrders(this.user);
  }

  async confirm() {
    return await aliasCommands.confirm(this.client, this.loginToken, this.user, this.message);
  }

  async generate() {
    return await aliasCommands.generate(this.client, this.loginToken, this.user, this.message);
  }

  async settings(edit) {
    return await aliasCommands.settings(edit, this.user, this.message);
  }

  async list(query) {
    return await aliasCommands.list(query, this.client, this.loginToken, this.user, this.message);
  }

  async me() {
    return await aliasCommands.me(this.client, this.loginToken);
  }

  async earnings() {
    return await aliasCommands.earnings(this.user);
  }

  async cashOut() {
    return await aliasCommands.cashOut(this.client, this.loginToken, this.user, this.message);
  }

  async cancel() {
    return await aliasCommands.cancel(this.client, this.loginToken, this.message, this.user);
  }

  async history() {
    return await aliasCommands.history(this.client, this.loginToken, this.message);
  }
};
