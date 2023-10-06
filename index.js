const { WebSocketServer } = require('ws');
const MQTTServiceClass = require("./mqttService");
const DeviceServiceClass = require("./deviceService");
const { getUniqueID } = require("./utils");

const wss = new WebSocketServer({ port: process.env.WSS_PORT || 8080 });

const subscribers = new Map();

const sendToSubscribers = (message) => {
  const messageStr = JSON.stringify(message);
  subscribers.forEach((subscriber) => {
    subscriber.send(messageStr);
  })
};

const DeviceService = new DeviceServiceClass(sendToSubscribers);

const sendToSubscribersFromMqtt = (message) => {
  sendToSubscribers(message);
  if (!DeviceService.isCheckActivity()) {
    DeviceService.startCheckActivity();
  }
};

const MQTTService = new MQTTServiceClass();
MQTTService.init(sendToSubscribersFromMqtt);

wss.on('connection', function connection(ws) {
  ws.ID = getUniqueID();
  subscribers.set(ws.ID, ws);

  ws.on('error', console.error);

  ws.on('message', function message(data) {
    console.log('received: %s', data);
  });

  ws.on('close', function() {
    console.log('connection closed');
    subscribers.delete(ws.ID);
    if (subscribers.size === 0) {
      DeviceService.stopCheckActivity();
    }
  });

  ws.send(JSON.stringify({
    status: 'connected WSS-MQTT'
  }));
});

// ====================== TESTING ======================

// To test WS sending messages with interval:
// setInterval(() => {
//   console.log('---WS subscribers.length---', subscribers.size);
//   sendToSubscribersFromMqtt({
//     value: Math.floor(Math.random() * 100) + 1
//   })
// }, 3000);

const getRandomId = (maxVal = 10) => Math.floor(Math.random() * maxVal) + 1

const getCameraId = () => `${getRandomId()}`;

const getMessage = () => ({
  image: 'https://picsum.photos/400/300?random&t=' + new Date().getTime(),
  peripheral: {
    type: "camera",
    // name: self.camera_name,
    id: getCameraId()
  },
  detections: []
})

// To test WS sending messages with camera updates:
setInterval(() => {
  const message = getMessage();
  console.log('---WS subscribers.length---', subscribers.size, message);
  sendToSubscribersFromMqtt(
    {
      message
    }
  )
}, 3000);