require('dotenv').config();
const { createServer } = require('https');
const { readFileSync } = require('fs');
const { WebSocketServer } = require('ws');
const { MQTTServiceClass } = require("./mqttService");
const DeviceServiceClass = require("./deviceService");
const { TYPES, WsMessageService} = require("./wsMessageService");
const { getUniqueID } = require("./utils");

const options = {
  port: process.env.WSS_PORT
  //port: 8080
}

// Not needed due to Istio TLS termination
// if (process.env.NODE_ENV !== 'development') {
//   options.server = createServer({
//     cert: readFileSync('./cert/cert.pem'),
//     key: readFileSync('./cert/key.pem'),
//   });
// }

const wss = new WebSocketServer(options);

const subscribers = new Map();

const sendToSubscribers = (data) => {
  const dataStr = JSON.stringify({
    ...data,
    type: TYPES.MESSAGE,
  });
  // console.log('sendToSubscribers')
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
  console.log('WS user connection opened');
  ws.ID = getUniqueID();
  subscribers.set(ws.ID, ws);

  ws.on('error', function error(err) {
    console.log('WS error', err);
  });

  ws.on('message', function message(dataRaw) {
    const data = JSON.parse(dataRaw);
    switch (data.type) {
      case TYPES.START_IMAGES_STREAM:
        const { peripheralName, duration } = data;
        MQTTService.playFrontEndVideo(peripheralName, duration);
        // TODO: use for testing next line
        // MQTTService.playFrontEndVideoTest(data.peripheralName);
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

// ====================== TESTING ======================
// MQTTService.runTest();
MQTTService.runNotificationsTest();

// To test removing cameras on FE side
// setInterval(() => {
//   sendToSubscribers(
//     WsMessageService.getInactiveDevices(['1','2','3','4','5'])
//   )
// }, 90000)