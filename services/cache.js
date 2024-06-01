const { createClient } = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.inited = false;
  }

  async init() {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    console.log('Connecting to Redis', url);
    this.client = await createClient({ url })
      .on('error', err => {
        console.log('Redis Client Error', err);
        this.inited = false;
      })
      .on('ready', () => {
        console.log('Redis Client Ready');
        this.inited = true;
      })
      .on('end', () => {
        console.log('Redis Client End');
        this.inited = false;
      })
      .on('reconnecting', () => {
        console.log('Redis Client Reconnecting');
        this.inited = false;
      })
      .connect();
  }

  async set(set, key, value, expiration = 60 * 60 * 24) {
    if (!this.inited) {
      return;
    }
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    await Promise.all([
      this.client.hSet(set, key, value),
      this.client.sendCommand(['EXPIREMEMBER', set, key, expiration.toString()])
    ]);
  }

  async size(set) {
    if (!this.inited) {
      return 0;
    }
    return await this.client.hLen(set);
  }

  async forEachEntry(set, cb) {
    const result = [];
    if (!this.inited) {
      return result;
    }

    let cursor = 0;
    do {
      const { cursor:nextCursor, tuples} = await this.client.hScan(set, cursor);
      cursor = nextCursor;
      for (const {field, value} of tuples) {
        result.push(cb(field, JSON.parse(value)));
      }
    } while (cursor !== 0);

    return result;
  }

}

module.exports = CacheService;
