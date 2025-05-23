const log = require('./logger');

/**
 * Schedules sending messages to a subscriber based on per-key intervals.
 */
class SubscriberMessageScheduler {
  /**
   * @param {string} subscriberId
   * @param {function} sendFn - function(key, message) to send message to subscriber
   * @param {MessageCollector} messageCollector
   * @param {object} options - { intervalMs: number, keyIntervals: { [key]: number } }
   */
  constructor(subscriberId, sendFn, messageCollector, options = {}) {
    this.subscriberId = subscriberId;
    this.sendFn = sendFn;
    this.messageCollector = messageCollector;
    this.defaultInterval = options.intervalMs || 1000;
    this.keyIntervals = options.keyIntervals || {}; // key -> intervalMs
    // key -> last sent timestamp
    this.lastSent = new Map();
    this.timer = setInterval(() => this.tick(), options.tickMs || 100);
  }

  stop() {
    clearInterval(this.timer);
  }

  setKeyInterval(key, intervalMs) {
    this.keyIntervals[key] = intervalMs;
  }

  tick() {
    const now = Date.now();
    for (const [key, { message, timestamp }] of this.messageCollector.getAllMessages()) {
      const interval = this.keyIntervals[key] || this.defaultInterval;
      const lastSent = this.lastSent.get(key) || 0;
      if (now - lastSent >= interval && timestamp > lastSent) {
        log.debug('Sending message to subscriber', {
          subscriberId: this.subscriberId,
          key,
          message,
          interval,
          lastSent,
        });
        this.sendFn(key, message);
        this.lastSent.set(key, now);
      }
    }
  }
}

module.exports = SubscriberMessageScheduler;
