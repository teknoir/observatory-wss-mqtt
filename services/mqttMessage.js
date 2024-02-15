const API_VERSION_TYPES = {
    V1_BETA1: 'teknoir.org/v1beta1',
}
const KIND_TYPES = {
    USER_INTERACTION: 'UserInteraction',
}
const METADATA_NAME_TYPES = {
    REQUEST_RAW_VIDEO: 'RequestRawVideo',
    REQUEST_VIDEO: 'RequestVideo',
}

class MqttMessageService {
    static getFrontEndRawVideo(device, maxFrameRate, duration, peripheralId) {
        return {
            apiVersion: API_VERSION_TYPES.V1_BETA1,
            kind: KIND_TYPES.USER_INTERACTION,
            metadata: {
                name: METADATA_NAME_TYPES.REQUEST_RAW_VIDEO
            },
            spec: {
                device: device,
                maxFrameRate,
                duration,
                camera: peripheralId
            }
        }
    }

    static getFrontEndVideo(device, maxFrameRate, duration, peripheralId) {
        return {
            apiVersion: API_VERSION_TYPES.V1_BETA1,
            kind: KIND_TYPES.USER_INTERACTION,
            metadata: {
                name: METADATA_NAME_TYPES.REQUEST_VIDEO
            },
            spec: {
                device: device,
                maxFrameRate,
                duration,
                camera: peripheralId
            }
        }
    }
}

module.exports = {
    MqttMessageService,
}
