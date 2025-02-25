const mqtt = require("mqtt");
const { timer, getUniqueID, composePeripheralKey } = require('../utils');
const { WsMessageService } = require('./wsMessage');
const { MqttMessageService } = require("./mqttMessage");

const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;
const brokerUrl = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;
const TOPIC = `/devices/+/events/inference`;
const TOPIC_VIDEO = 'front-end-video';
const RAW_TOPIC_VIDEO = 'raw-front-end-video';
const TOPIC_ALERT = 'front-end-alert';
const videoExpiration = 60 * 60; // 1 hour
const statExpiration = 60 * 60 * 24; // 1 day


class MQTTService {
  constructor() {
    this.client = null;
    this.sendFn = null;
    this.setCacheFn = null;
    // TODO: remove next line
    this.maxDevicesTest = 10;
  }

  init(sendFn, setCacheFn) {
    try {
      this.sendFn = sendFn;
      this.setCacheFn = setCacheFn;
      console.log('Connecting to MQTT', brokerUrl);
      this.client = mqtt.connect(brokerUrl, {
        username: MQTT_USER,
        password: MQTT_PASS
      });
      this.client.on("connect", () => {
        console.log('MQTT connected');
        this.subscribe(TOPIC);
      });
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

    if (typeof message !== 'object' || message === null) {
      console.log(`Received bad format message from topic: ${topic}`);
      return;
    }

    const peripheral = message.data?.peripheral || message.peripheral;
    
    const device = this.getDeviceFromTopic(topic);
    const peripheralId = peripheral?.id;
    // caching key if not exists to collect statistics for each device and peripheral
    if (device && peripheralId) {
      this.setCacheFn('stat', composePeripheralKey({ device, peripheralId }), { info: peripheral }, statExpiration);
    }

    if (this.sendFn && this.isFrontEndVideoTopic(message?.topic)) {
      const frontEndVideoMessage = WsMessageService.getFrontEndVideo(device, message)
      this.sendFn(frontEndVideoMessage);
      if (device && peripheralId) {
        this.setCacheFn('video', composePeripheralKey({ device, peripheralId }), frontEndVideoMessage, videoExpiration);
      }
    }
  }

  publish(topic, message) {
    this.client.publish(topic, message);
  }

  playFrontEndVideo(options) {
    const { device, peripheralId, duration = 12, maxFrameRate = 10 } = options;
    const topic = this.getTopicPlayVideo(device);
    this.publish(topic, JSON.stringify(
        MqttMessageService.getFrontEndVideo(device, maxFrameRate, duration, peripheralId))
    );
  }

  playFrontEndRawVideo(options) {
    const { device, peripheralId, duration = 12, maxFrameRate = 10 } = options;
    const topic = this.getTopicPlayVideo(device);
    this.publish(topic, JSON.stringify(
        MqttMessageService.getFrontEndRawVideo(device, maxFrameRate, duration, peripheralId))
    );
  }

  isFrontEndVideoTopic(topic) {
    return topic === TOPIC_VIDEO || topic === RAW_TOPIC_VIDEO;
  }

  getDeviceFromTopic(topic) {
    const res = topic.match(/\/devices\/(?<device>.+)\/events\/inference/);
    return res?.[1];
  }

  getTopicPlayVideo = device => `/devices/${device}/commands/framerates`;

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
    this.sendFn(WsMessageService.getFrontEndAlert(message));
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
    const message =  {
      topic: TOPIC_VIDEO,
      image: 'https://picsum.photos/400/300?random&t=' + new Date().getTime(),
      peripheral: {
        type: "camera",
        name: `camera_${id}`,
        id: id || getCameraId()
      },
      detections: []
    }
    return WsMessageService.getFrontEndVideo('test-device', message)
  }

  async test() {
    for (let i = 0; i < this.maxDevicesTest; i++) {
      console.log('---PUBLISH---', i);
      const message = this.getMessage(i + 1);
      this.sendFn(message);
      await timer(10000);
    }
  }

  // Imitation a video playing on front-end, like 5 image per second, during 6 seconds
  async playFrontEndVideoTest(options) {
    const { peripheralId } = options;
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

  async disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

module.exports = {
  MQTTServiceClass: MQTTService,
  TOPIC
}
