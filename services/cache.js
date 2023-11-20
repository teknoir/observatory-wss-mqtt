// TODO: Use Redis instead of Map
class CacheService {
  constructor() {
    this.cache = new Map();
  }

  set(key, value) {
    this.cache.set(key, value);
  }

  size() {
    return this.cache.size;
  }

  getAll() {
    const res = [];
    this.cache.forEach((message) => {
      res.push(message);
    });
    return res;
  }
}

module.exports = CacheService;