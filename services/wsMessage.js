const TYPES = {
  MESSAGE: 'MESSAGE',
  INACTIVE: 'INACTIVE',
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
}

module.exports = {
  WsMessageService,
  TYPES
}
