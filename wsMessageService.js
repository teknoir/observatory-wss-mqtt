const TYPES = {
  INACTIVE: 'INACTIVE',
}
class WsMessageService {
  static getInactiveDevices(ids) {
    return {
      type: TYPES.INACTIVE,
      meta: {
        ids
      }
    }
  }
}

module.exports = WsMessageService;
