const TYPES = {
  INACTIVE: 'INACTIVE',
  START_IMAGES_STREAM: 'START_IMAGES_STREAM',
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

module.exports = {
  WsMessageService,
  TYPES
}
