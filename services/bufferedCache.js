const CacheService = require('./cache');
const logger = require('./logger');

const FLUSH_CACHE_BUFFER_INTERVAL = process.env.FLUSH_CACHE_BUFFER_INTERVAL || 30000; // 30 seconds

class BufferedCacheService extends CacheService {
  constructor() {
    super();
    this.buffer = {};
  }

  async init() {
    await super.init();

    logger.debug('BufferedCacheService inited');

    setInterval(() => {
      this.flushBuffer().catch(err => {
        console.error('Error flushing buffer:', err);
      });
    }, FLUSH_CACHE_BUFFER_INTERVAL);
  }

  async flushBuffer() {
    if (!this.inited) {
      return;
    }

    logger.debug('Flushing buffer to Redis');

    const keys = Object.keys(this.buffer);
    if (keys.length === 0) {
      return;
    }

    const multi = this.client.multi();
    for (const set of keys) {
      const entries = this.buffer[set];
      for (const [key, { value, expiration }] of Object.entries(entries)) {
        multi.hSet(set, key, value);
        multi.addCommand(['EXPIREMEMBER', set, key, expiration.toString()]);
      }
      logger.debug(`Flushing buffer to Redis for set '${set}': ${Object.keys(entries).length} entries`);
    }

    this.buffer = {};
    await multi.exec();
  }

  async set(set, key, value, expiration = 60 * 60 * 24) {
    if (!this.buffer[set]) {
      this.buffer[set] = {};
    }

    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }

    this.buffer[set][key] = { value, expiration };
  }
}

module.exports = BufferedCacheService;
