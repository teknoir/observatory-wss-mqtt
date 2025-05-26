const { composePeripheralKey } = require('../utils');

/**
 * Collects the latest message and timestamp for each key (by composePeripheralKey).
 */
class MessageCollector {
  constructor() {
    // key: composePeripheralKey(data) -> { message, timestamp }
    this.latestMessages = new Map();
  }

  addMessage(data) {
    const key = composePeripheralKey(data);
    this.latestMessages.set(key, {
      message: data,
      timestamp: Date.now(),
    });
  }

  getLatestMessage(key) {
    return this.latestMessages.get(key);
  }

  getAllKeys() {
    return Array.from(this.latestMessages.keys());
  }

  getAllMessages() {
    return Array.from(this.latestMessages.entries());
  }
}

module.exports = MessageCollector;
