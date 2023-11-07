const mqtt = require("mqtt");
const { timer, getUniqueID } = require('./utils');

const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;
const brokerUrl = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;
const DEVICE = 'orin-demo-se';
const TOPIC = `/devices/${DEVICE}/events`;
const TOPIC_VIDEO = 'front-end-video';
const TOPIC_ALERT = 'front-end-alert';
const TOPIC_PLAY_VIDEO = `/devices/${DEVICE}/commands/devstudio`;

class MQTTService {
  constructor() {
    this.client = null;
    this.sendFn = null;
    // TODO: remove next line
    this.maxDevicesTest = 10;
  }

  init(sendFn) {
    try {
      this.sendFn = sendFn;
      this.client = mqtt.connect(brokerUrl, {
        username: MQTT_USER,
        password: MQTT_PASS
      });
      this.client.on("connect", () => {
        this.subscribe(TOPIC);
      })
      this.client.on("message", this.onMessage.bind(this));
    } catch (e) {
      console.log('MQTT error', e);
    }
  }

  subscribe(topic) {
    this.client.subscribe(topic, (err) => {
      if (err) {
        console.log('err', err)
      }
    });
  }

  onMessage(topic, bufferMessage) {
    // console.log('------MESSAGE MQTT----', topic);
    const messageStr = bufferMessage.toString();
    const message = JSON.parse(messageStr);
    if (this.sendFn && message?.topic === TOPIC_VIDEO) {
      this.sendFn(message);
    }
  }

  publish(topic, message) {
    this.client.publish(topic, message);
  }

  playFrontEndVideo(peripheralName, duration = 12, maxFrameRate = 10) {
    this.publish(TOPIC_PLAY_VIDEO, JSON.stringify({
      apiVersion: "teknoir.org/v1beta1",
      kind: "UserInteraction",
      metadata: {
        name: "RequestVideo"
      },
      spec: {
        device: DEVICE,
        maxFrameRate,
        duration,
        camera: peripheralName
      }
    }));
  }

  // TODO: All lines below for testing purposes, they might be removed in future
  runNotificationsTest() {
    this.testNotification();
    const testId = setInterval(() => {
      this.testNotification();
    }, 20000);
  }

  testNotification() {
    const detectionId = getUniqueID();
    const peripheralId = 'parkinglot1';
    // const now = (new Date()).toISOString();
    const startDate = new Date();
    const endDate = new Date();
    startDate.setSeconds(startDate.getSeconds() - 30);
    endDate.setSeconds(endDate.getSeconds() - 15);
    const message = {
      topic: TOPIC_ALERT,
      event: {
        detection_id: detectionId,
        peripheral_id: peripheralId,
        peripheral_name: peripheralId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        is_verified: false
      }
    }
    this.sendFn(message);
  }

  runTest() {
    this.test();
    const testId = setInterval(() => {
      this.test();
    }, 20000);
  }

  getMessage (id) {
    const getRandomId = (maxVal = this.maxDevicesTest) => Math.floor(Math.random() * maxVal) + 1
    const getCameraId = () => `${getRandomId()}`;
    return {
      topic: TOPIC_VIDEO,
      image: 'https://picsum.photos/400/300?random&t=' + new Date().getTime(),
      peripheral: {
        type: "camera",
        // name: self.camera_name,
        id: id || getCameraId()
      },
      detections: []
    }
  }

  async test() {
    for (let i = 0; i < this.maxDevicesTest; i++) {
      console.log('---PUBLISH---', i);
      const message = this.getMessage();
      this.sendFn(message);
      await timer(10000);
    }
  }

  // Imitation a video playing on front-end, like 5 image per second, during 6 seconds
  async playFrontEndVideoTest(peripheralId) {
    let isShow = true
    const timerId = setTimeout(() => {
      isShow = false;
    }, 10000)
    while(isShow) {
      const message = this.getMessage(peripheralId);
      this.sendFn(message);
      await timer(500);
    }
  }
}

module.exports = {
  MQTTServiceClass: MQTTService,
  TOPIC
}
