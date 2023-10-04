const mqtt = require("mqtt");

const MQTT_HOST = process.env.MQTT_HOST || '127.0.0.1';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const brokerUrl = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;
// const brokerUrl = `mqtt://test.mosquitto.org`;
// TODO: it may be changed
const TOPIC = '/devices/orin-demo-se/events';

class MQTTService {
  constructor() {
    this.client = null;
    this.sendFn = null;
  }

  init(sendFn) {
    this.sendFn = sendFn;
    this.client = mqtt.connect(brokerUrl);
    this.client.on("connect", () => {
      // this.subscribe("presence");
      this.subscribe(TOPIC);
    })
    this.client.on("message", this.onMessage.bind(this));
  }

  subscribe(topic) {
    this.client.subscribe(topic, (err) => {
      if (!err) {
        this.client.publish(topic, `Hello mqtt - ${topic}`);
      } else {
        console.log('err', err)
      }
    });
  }

  onMessage(topic, message) {
    console.log('------MESSAGE MQTT----', topic, message.toString());
    if (this.sendFn) {
      this.sendFn(message);
    }
    this.client.end();
  }

  publish(topic, message) {
    this.client.publish(topic, message);
  }
}

module.exports = MQTTService;
