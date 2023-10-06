const WsMessageService = require('./wsMessageService');

const CHECK_ACTIVE_INTERVAL = process.env.CHECK_ACTIVE_INTERVAL || 10 * 1000;
const ACTIVE_INTERVAL = process.env.TIME_INTERVAL || 60 * 1000;

class DeviceService {
  constructor(wsSenderFn) {
    this.devices = new Map();
    this.wsSenderFn = wsSenderFn;
    this.activityIntervalId = null;
  }

  isCheckActivity() {
    return !!this.activityIntervalId;
  }

  checkActivity() {
    if (!this.devices.size) {
      return this.stopCheckActivity();
    }
    const currentTime = Date.now();
    const ids = [];
    this.devices.forEach((value, key) => {
      if (currentTime - value > ACTIVE_INTERVAL) {
        ids.push(key);
      }
    });
    if (ids.length > 0) {
      this.wsSenderFn(WsMessageService.getInactiveDevices(ids))
    }
  }

  startCheckActivity() {
    if (!this.activityIntervalId) {
      this.activityIntervalId = setInterval(() => {
        this.checkActivity();
      }, CHECK_ACTIVE_INTERVAL);
    }
  }

  stopCheckActivity() {
    if (this.activityIntervalId) {
      clearInterval(this.activityIntervalId);
    }
  }
}

module.exports = DeviceService;
