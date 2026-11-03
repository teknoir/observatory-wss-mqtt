// TODO: think about using other approach instead of function
const getUniqueID = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return s4() + s4() + '-' + s4();
};

const timer = ms => new Promise(res => setTimeout(res, ms))

function composePeripheralKey(data) {
  const device = data?.device ?? '';
  const peripheralId = (data?.data?.peripheral?.id || data?.peripheralId) ?? '';
  return JSON.stringify({ device, peripheralId });
}

/**
 * The camera a stream message belongs to. NVR frames carry it under `data.peripheral`, older apps at the top level.
 */
function peripheralIdOf(data) {
  return data?.data?.peripheral?.id ?? data?.peripheral?.id;
}

/**
 * Whether a socket opened with `?device=` and/or `?peripheral=` wants this stream message.
 */
function isSubscribedToData(subscriber, data) {
  if (subscriber.device && subscriber.device != data?.device) {
    return false;
  }

  if (subscriber.peripheral && subscriber.peripheral != peripheralIdOf(data)) {
    return false;
  }

  return true;
}

function decomposePeripheralKey(key) {
  try {
    const { device, peripheralId } = JSON.parse(key);
    return { device, peripheralId };
  } catch (e) {
    console.error('decomposePeripheralKey error', e);
    return { device: '', peripheralId: '' };
  }
}

module.exports = {
  getUniqueID,
  timer,
  composePeripheralKey,
  decomposePeripheralKey,
  isSubscribedToData,
  peripheralIdOf,
}
