const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isSubscribedToData, peripheralIdOf } = require('../utils');

const nvrFrame = { type: 'MESSAGE', device: 'amr-01', data: { peripheral: { id: 'cam1' }, image: 'x' } };
const topLevelFrame = { type: 'MESSAGE', device: 'amr-01', peripheral: { id: 'cam1' }, image: 'x' };

test('peripheralIdOf reads the NVR shape and the top-level shape', () => {
  assert.equal(peripheralIdOf(nvrFrame), 'cam1');
  assert.equal(peripheralIdOf(topLevelFrame), 'cam1');
  assert.equal(peripheralIdOf({ device: 'amr-01' }), undefined);
  assert.equal(peripheralIdOf(undefined), undefined);
});

test('a camera-filtered socket gets NVR frames of that camera', () => {
  assert.equal(isSubscribedToData({ device: 'amr-01', peripheral: 'cam1' }, nvrFrame), true);
  assert.equal(isSubscribedToData({ peripheral: 'cam1' }, nvrFrame), true);
});

test('a camera-filtered socket still gets top-level frames of that camera', () => {
  assert.equal(isSubscribedToData({ device: 'amr-01', peripheral: 'cam1' }, topLevelFrame), true);
});

test('other cameras and other devices are filtered out', () => {
  assert.equal(isSubscribedToData({ peripheral: 'cam2' }, nvrFrame), false);
  assert.equal(isSubscribedToData({ peripheral: 'cam2' }, topLevelFrame), false);
  assert.equal(isSubscribedToData({ device: 'amr-02' }, nvrFrame), false);
  assert.equal(isSubscribedToData({ device: 'amr-02', peripheral: 'cam1' }, nvrFrame), false);
  assert.equal(isSubscribedToData({ peripheral: 'cam1' }, { device: 'amr-01' }), false);
});

test('an unfiltered socket gets everything', () => {
  assert.equal(isSubscribedToData({}, nvrFrame), true);
  assert.equal(isSubscribedToData({ device: 'amr-01' }, nvrFrame), true);
});
