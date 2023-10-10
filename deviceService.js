const { WsMessageService } = require('./wsMessageService');

const CHECK_ACTIVE_INTERVAL = process.env.CHECK_ACTIVE_INTERVAL;
const ACTIVE_INTERVAL = process.env.TIME_INTERVAL;

class DeviceService {
  constructor(wsSenderFn) {
    this.devices = new Map();
    this.wsSenderFn = wsSenderFn;
    this.activityIntervalId = null;
  }

  track(data) {
    const peripheralId = data?.event?.peripheral_id;
    // TODO: use correct timestamp value
    if (peripheralId) {
      this.devices.set(peripheralId, Date.now());
      // this.devices.set(message.peripheral.id, message.timestamp);
    }
  }

  isCheckActivity() {
    return !!this.activityIntervalId;
  }

  checkActivity() {
    console.log('------------checkActivity', this.devices)
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
      this.checkActivity();
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
