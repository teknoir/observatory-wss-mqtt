const mqtt = require("mqtt");
const { timer } = require('./utils');

const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;
const brokerUrl = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;
const TOPIC = '/devices/orin-demo-se/events';
const TOPIC_VIDEO = 'front-end-video';

class MQTTService {
  constructor() {
    this.client = null;
    this.sendFn = null;
    // TODO: remove next line
    this.maxDevicesTest = 10;
  }

  init(sendFn) {
    console.log(
      'MQTT credentials:',
      brokerUrl,
      MQTT_USER,
      MQTT_PASS
    );
    try {
      this.sendFn = sendFn;
      this.client = mqtt.connect(brokerUrl, {
        username: MQTT_USER,
        password: MQTT_PASS
      });
      this.client.on("connect", () => {
        console.log('MQTT connected')
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
    console.log('------MESSAGE MQTT----', topic);
    const messageStr = bufferMessage.toString();
    const message = JSON.parse(messageStr);
    if (this.sendFn && message?.event?.topic === TOPIC_VIDEO) {
      this.sendFn(message);
    }
  }

  publish(topic, message) {
    console.log('------PUBLISH MQTT----', topic, message)
    this.client.publish(topic, message);
  }

  playFrontEndVideo(deviceId) {
    this.publish(TOPIC_VIDEO, JSON.stringify({
      "front-end-video": deviceId
    }));
  }

  // TODO: All lines below for testing purposes, they might be removed in future
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
      this.sendFn({ message });
      await timer(1000);
    }
  }

  // Imitation a video playing on front-end, like 5 image per second, during 6 seconds
  async playFrontEndVideoTest(deviceId) {
    let isShow = true
    const timerId = setTimeout(() => {
      isShow = false;
    }, 6000)
    while(isShow) {
      const message = this.getMessage(deviceId);
      this.sendFn({ message });
      await timer(200);
    }
  }
}

module.exports = {
  MQTTServiceClass: MQTTService,
  TOPIC
}
