require('dotenv').config();
const { WebSocketServer } = require('ws');
const { MQTTServiceClass } = require("./services/mqtt");
const DeviceServiceClass = require("./services/device");
const CacheServiceClass = require("./services/bufferedCache");
const { TYPES, WsMessageService} = require("./services/wsMessage");
const { getUniqueID, decomposePeripheralKey } = require("./utils");
const log = require('./services/logger');
 
const options = {
  port: process.env.WSS_PORT || 8080,
}

const wss = new WebSocketServer(options);

const subscribers = new Map();

const isSubscribedToData = (subscriber, data) => {
  if (subscriber.device && subscriber.device != data?.device) {
    return false;
  }

  if (subscriber.peripheral && subscriber.peripheral != data?.peripheral?.id) {
    return false;
  }

  return true;
};

const sendToSubscribers = (data) => {
  const isStream = data?.type === TYPES.MESSAGE;
  const dataStr = JSON.stringify(data);

  log.debug('sendToSubscribers', { subscribers: subscribers?.size });

  for (const [id, subscriber] of subscribers.entries()) {
    if (subscriber.readyState === WebSocket.CONNECTING) {
      // Skip connecting sockets
      log.debug('subscriber is connecting - skip', { id });
      continue;
    }

    if (subscriber.readyState !== WebSocket.OPEN) {
      // Remove dead socket
      subscribers.delete(id);
      log.warn('subscriber is not open - removed', { id });
      continue;
    }

    if (isStream && !isSubscribedToData(subscriber, data)) {
      return;
    }

    subscriber.send(dataStr);
  }
};

const DeviceService = new DeviceServiceClass(sendToSubscribers);

const sendToSubscribersFromMqtt = (data) => {
  sendToSubscribers(data);
  DeviceService.track(data);
  if (!DeviceService.isCheckActivity()) {
    DeviceService.startCheckActivity();
  }
};

const sendCacheStat = async (ws) => {
  const size = await CacheService.size('stat');
  const stat = {
    size,
    devices: {},
  };

  if (size != 0) {
    await CacheService.forEachEntry('stat', (key, message) => {
      const { device, peripheralId } = decomposePeripheralKey(key);
      if (!stat.devices[device]) {
        stat.devices[device] = {
          peripherals: {},
        };
      }

      stat.devices[device].peripherals[peripheralId] = message;
    });
  }

  ws.send(JSON.stringify(WsMessageService.getCacheStatMessage(stat)));
}

const sendCachedVideo = async (ws) => {
  if (ws.skipStream) {
    return;
  }

  await Promise.all(await CacheService.forEachEntry('video', (_, message) => {
    if (!isSubscribedToData(ws, message)) {
      return Promise.resolve();
    }
    return new Promise(resolve => ws.send(JSON.stringify(message), resolve));
  }));
};

const initSubscriber = (ws, incomingMessage) => {
  ws.ID = getUniqueID();

  log.info('initSubscriber', { id: ws.ID });

  const u = new URL(incomingMessage.url || '/', 'http://localhost');
  const device = u.searchParams.get('device');
  const peripheral = u.searchParams.get('peripheral');
  const skipStream = u.searchParams.get('skipstream');

  if (device) {
    ws.device = device;
  }

  if (peripheral) {
    ws.peripheral = peripheral;
  }

  ws.skipStream = !!skipStream;
  if (!skipStream) {
    subscribers.set(ws.ID, ws);
  }
};

const CacheService = new CacheServiceClass();
CacheService.init();
const MQTTService = new MQTTServiceClass();
MQTTService.init(
  sendToSubscribersFromMqtt,
  CacheService.set.bind(CacheService),
);

wss.on('connection', function connection(ws, incomingMessage) {
  log.info(`WS user connection opened url = ${incomingMessage.url}`);

  initSubscriber(ws, incomingMessage);

  ws.on('error', function error(err) {
    log.error('WS error', { error: err });
  });

  // Send cache stat to new client
  sendCacheStat(ws);
  // Send to client existing images from the CacheService
  sendCachedVideo(ws);

  ws.on('message', function message(dataRaw) {
    const data = JSON.parse(dataRaw);
    const { device, peripheralId, duration, maxFrameRate } = data;

    switch (data.type) {
      case TYPES.START_IMAGES_STREAM:
        MQTTService.playFrontEndVideo({
          device,
          peripheralId,
          duration,
          maxFrameRate,
        });
        // TODO: use for testing next line
        // MQTTService.playFrontEndVideoTest({ peripheralId: data.peripheralId });
        break;
      case TYPES.START_RAW_IMAGES_STREAM:
        MQTTService.playFrontEndRawVideo({
          device,
          peripheralId,
          duration,
          maxFrameRate,
        });
        break;
    }
  });

  ws.on('close', function() {
    log.info('connection closed', { id: ws.ID });
    subscribers.delete(ws.ID);
    if (subscribers.size === 0) {
      DeviceService.stopCheckActivity();
    }
  });

  ws.send(
    JSON.stringify({
      status: "connected WSS-MQTT",
    }),
  );
});

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  wss?.close();
  MQTTService?.disconnect();
});

// ====================== TESTING ======================
// MQTTService.runTest();
// MQTTService.runNotificationsTest();

// To test removing cameras on FE side
// setInterval(() => {
//   sendToSubscribers(
//     WsMessageService.getInactiveDevices(['boxerproperty3', 'boxerproperty11'])
//   )
// }, 10000)
