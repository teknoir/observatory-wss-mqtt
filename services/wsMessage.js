const TYPES = {
  MESSAGE: 'MESSAGE',
  INACTIVE: 'INACTIVE',
  CACHE_STAT: 'CACHE_STAT',
  START_IMAGES_STREAM: 'START_IMAGES_STREAM',
  START_RAW_IMAGES_STREAM: 'START_RAW_IMAGES_STREAM',
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

  static getFrontEndVideo(device, message) {
    return {
      ...message,
      type: TYPES.MESSAGE,
      device,
    }
  }

  static getFrontEndAlert(message) {
    return {
      ...message,
      type: TYPES.MESSAGE,
    }
  }

  static getCacheStatMessage(meta) {
    return {
      type: TYPES.CACHE_STAT,
      meta,
    }
  }
}

module.exports = {
  WsMessageService,
  TYPES
}
