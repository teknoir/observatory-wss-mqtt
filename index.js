require('dotenv').config();
const { createServer } = require('https');
const { readFileSync } = require('fs');
const { WebSocketServer } = require('ws');
const { MQTTServiceClass } = require("./services/mqtt");
const DeviceServiceClass = require("./services/device");
const { TYPES, WsMessageService} = require("./services/wsMessage");
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
  const dataStr = JSON.stringify(data);
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
        const { device, peripheralName, duration } = data;
        MQTTService.playFrontEndVideo({ device, peripheralName, duration });
        // TODO: use for testing next line
        // MQTTService.playFrontEndVideoTest({ peripheralId: data.peripheralName });
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
//     WsMessageService.getInactiveDevices(['boxerproperty3', 'boxerproperty11'])
//   )
// }, 10000)