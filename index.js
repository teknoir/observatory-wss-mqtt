const { WebSocketServer } = require('ws');
const MQTTServiceClass = require("./mqttService");
const DeviceServiceClass = require("./deviceService");
const { getUniqueID } = require("./utils");

const wss = new WebSocketServer({ port: process.env.WSS_PORT || 8080 });

const subscribers = new Map();

const sendToSubscribers = (data) => {
  const dataStr = JSON.stringify(data);
  console.log('sendToSubscribers', dataStr)
  subscribers.forEach((subscriber) => {
    subscriber.send(dataStr);
  })
};

const DeviceService = new DeviceServiceClass(sendToSubscribers);

const sendToSubscribersFromMqtt = (data) => {
  sendToSubscribers(data);
  DeviceService.track(data);
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
MQTTService.runTest();
