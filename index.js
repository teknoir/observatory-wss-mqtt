require('dotenv').config();
const { WebSocketServer } = require('ws');
const { MQTTServiceClass } = require("./mqttService");
const DeviceServiceClass = require("./deviceService");
const { TYPES, WsMessageService} = require("./wsMessageService");
const { getUniqueID } = require("./utils");

console.log('process.env', process.env)

const wss = new WebSocketServer({ port: process.env.WSS_PORT });

const subscribers = new Map();

const sendToSubscribers = (data) => {
  const dataStr = JSON.stringify({
    type: TYPES.MESSAGE,
    ...data
  });
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

  ws.on('message', function message(dataRaw) {
    console.log('WS received: ', dataRaw);
    const data = JSON.parse(dataRaw);
    switch (data.type) {
      case TYPES.START_IMAGES_STREAM:
        // TODO: replace two lines below (TEST mode used now)
        console.log('data.cameraId', data.cameraId)
        MQTTService.playFrontEndVideo(data.cameraId);
        // MQTTService.playFrontEndVideoTest(data.cameraId);
    }
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

console.log('COMMIT 48c8b838da8ff0b1156aba61eed9db0cb1196b79, build 20.10')

// ====================== TESTING ======================
// MQTTService.runTest();

// To test removing cameras on FE side
// setInterval(() => {
//   sendToSubscribers(
//     WsMessageService.getInactiveDevices(['1','2','3','4','5'])
//   )
// }, 90000)