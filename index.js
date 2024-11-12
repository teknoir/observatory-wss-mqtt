require('dotenv').config();
const { WebSocketServer } = require('ws');
const { MQTTServiceClass } = require("./services/mqtt");
const DeviceServiceClass = require("./services/device");
const CacheServiceClass = require("./services/cache");
const { TYPES, WsMessageService} = require("./services/wsMessage");
const { getUniqueID, decomposePeripheralKey } = require("./utils");
const { acceptAnswer, createOffer } = require("./services/webRtc");

let webRtcConnectionData;

const options = {
  port: process.env.WSS_PORT || 8080,
}

const wss = new WebSocketServer(options);

const subscribers = new Map();
const dataChanellSubscribers = new Map();

const filterStream = (subscriber, data) => {
  if (subscriber.device && subscriber.device != data?.device) {
    return true;
  }

  if (subscriber.peripheral && subscriber.peripheral != data?.peripheral?.id) {
    return true;
  }

  return false;
};

const sendToDataChanellSubscribers = (data) => {
  const isStream = data?.type === TYPES.MESSAGE;
  const dataStr = JSON.stringify(data);
  const chunkSize = 15 * 1024; // 15KB
  console.log('sendToDataChanellSubscribers', dataChanellSubscribers.size)

  dataChanellSubscribers.forEach((subscriber) => {
    if (subscriber.readyState !== 'open') { 
      console.log('Data channel is not ready:', subscriber.readyState);
      return;
    }

    if (subscriber.bufferedAmount > 0) { 
      console.log('Data channel has buffered amount', subscriber.bufferedAmount);
      return;
    }

    if (isStream && filterStream(subscriber, data)) {
      return;
    }

    const chunkId = new Date().getTime();  // Unique ID for this message
    const totalChunks = Math.ceil(dataStr.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = dataStr.slice(i * chunkSize, (i + 1) * chunkSize);
      const chunkMessage = JSON.stringify({
        chunkId,
        sequenceNumber: i,
        totalChunks,
        data: chunk
      });
      subscriber.send(chunkMessage);
    }
    console.log('Data channel message sent. Total chunks:', totalChunks);

    // subscriber.send(dataStr);
    // subscriber.send('Data stream');
  });
};

const sendToSubscribers = (data) => {
  const isStream = data?.type === TYPES.MESSAGE;
  const dataStr = JSON.stringify(data);
  // console.log('sendToSubscribers')
  subscribers.forEach((subscriber) => {
    if (isStream && filterStream(subscriber, data)) {
      return;
    }
    subscriber.send(dataStr);
  });
};

const DeviceService = new DeviceServiceClass(sendToSubscribers);

const sendToSubscribersFromMqtt = (data) => {
  // sendToSubscribers(data);
  sendToDataChanellSubscribers(data);
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
    if (filterStream(ws, message)) {
      return Promise.resolve();
    }
    return new Promise(resolve => ws.send(JSON.stringify(message), resolve));
  }));
};

const initDataChanellSubscriber = (dc, ws) => {
  dc.ID = ws.ID;

  const device = ws.device;
  const peripheral = ws.peripheral;

  if (device) {
    ws.device = device;
  }

  if (peripheral) {
    ws.peripheral = peripheral;
  }

  console.log('initDataChanellSubscriber', ws.ID);
  dataChanellSubscribers.set(ws.ID, dc);
};

const initSubscriber = (ws, incomingMessage) => {
  ws.ID = getUniqueID();

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
MQTTService.init(sendToSubscribersFromMqtt, CacheService.set.bind(CacheService));

wss.on('connection', function connection(ws, incomingMessage) {
  console.log(`WS user connection opened url = ${incomingMessage.url}`);

  initSubscriber(ws, incomingMessage);
  // Send cache stat to new client
  sendCacheStat(ws);
  // Send to client existing images from the CacheService
  sendCachedVideo(ws);

  ws.on('error', function error(err) {
    console.log('WS error', err);
  });

  ws.on('message', function message(dataRaw) {
    const data = JSON.parse(dataRaw);
    const { device, peripheralId, duration } = data;

    switch (data.type) {
      case 'WebRTCRequest':
        console.log('[WEBSocket] WebRTC message REQUEST received');
        createOffer().then((data) => {
          ws.send(JSON.stringify({ type: 'WebRTCOffer', offer: data.offer }));
          console.log('[WEBSocket] WebRTC offer sent');
          webRtcConnectionData = data;
        });
        break;
      case 'WebRTCAnswer':
        console.log('[WEBSocket] WebRTC ANSWER received');
        acceptAnswer(data.answer, webRtcConnectionData.peerConnection).then(() => {
          ws.send(JSON.stringify({ type: 'WebRTCAccepted' }));
          console.log('[WEBSocket] WebRTC answer accepted sent');
          initDataChanellSubscriber(webRtcConnectionData.dataChannel, ws);
        });
        break;
      case TYPES.START_IMAGES_STREAM:
        MQTTService.playFrontEndVideo({ device, peripheralId, duration });
        // TODO: use for testing next line
        // MQTTService.playFrontEndVideoTest({ peripheralId: data.peripheralId });
        break;
      case TYPES.START_RAW_IMAGES_STREAM:
        MQTTService.playFrontEndRawVideo({ device, peripheralId, duration });
        break;
    }
  });

  ws.on('close', function() {
    console.log('connection closed');
    webRtcConnectionData?.dataChannel.close();
    webRtcConnectionData?.peerConnection.close();
    webRtcConnectionData = null;
    subscribers.delete(ws.ID);
    if (subscribers.size === 0) {
      DeviceService.stopCheckActivity();
    }
  });

  ws.send(JSON.stringify({
    status: 'connected WSS-MQTT'
  }));
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