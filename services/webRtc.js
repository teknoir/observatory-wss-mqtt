// Import the wrtc module
const wrtc = require('@roamhq/wrtc');

// Create Peer Connections
// const localConnection = new wrtc.RTCPeerConnection();
// const remoteConnection = new wrtc.RTCPeerConnection();

// Create a data channel on the local peer connection
// const dataChannel = localConnection.createDataChannel("myDataChannel");

// Event handler for the data channel's open and message events
// dataChannel.onopen = () => {
//   console.log("Data channel is open and ready to be used.");
//   dataChannel.send("Hello from Node.js Peer!");
// };

// dataChannel.onmessage = (event) => {
//   console.log("Message from Remote Peer:", event.data);
// };

// Set up the remote peer to receive the data channel
// remoteConnection.ondatachannel = (event) => {
//   const receiveChannel = event.channel;
//   receiveChannel.onmessage = (e) => {
//     console.log("Received Message:", e.data);
//   };
// };

// Handle ICE candidate exchange
// localConnection.onicecandidate = (event) => {
//   if (event.candidate) {
//     remoteConnection.addIceCandidate(event.candidate);
//   }
// };

// remoteConnection.onicecandidate = (event) => {
//   if (event.candidate) {
//     localConnection.addIceCandidate(event.candidate);
//   }
// };

// Create an offer from the local peer, set descriptions, and establish the connection
// localConnection.createOffer()
//   .then((offer) => localConnection.setLocalDescription(offer))
//   .then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
//   .then(() => remoteConnection.createAnswer())
//   .then((answer) => remoteConnection.setLocalDescription(answer))
//   .then(() => localConnection.setRemoteDescription(remoteConnection.localDescription))
//   .catch((error) => console.error("Error setting up WebRTC connection:", error));

async function createOffer() {
  const peerConnection = new wrtc.RTCPeerConnection({
    sdpSemantics: "unified-plan",
    // 'iceServers': [{'urls': ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']}],
    portRange: { min: 30000, max: 30003 },
  });

  try {
    let dataChannel = peerConnection.createDataChannel("myDataChannel");

    peerConnection.addEventListener('connectionstatechange', event => {
      if (peerConnection.connectionState === 'connected') {
          // Peers connected!
      }
      console.log("Connection State:", peerConnection.connectionState);
    });

    peerConnection.removeEventListener('iceconnectionstatechange', (ev) => {
      console.log("ICE connection state change:", peerConnection.iceConnectionState);
    });

    // Listen for changes in the ICE gathering state
    peerConnection.addEventListener('icegatheringstatechange', () => {
      if (peerConnection.iceGatheringState === 'complete') {
        console.log('All ICE candidates gathered');
        // Now you can safely access the SDP with candidates
        // console.log(peerConnection.localDescription.sdp);
      }
      console.log('ICE gathering state change', peerConnection.iceGatheringState);
    });

    const icePromise = new Promise((resolve, reject) => {
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate.candidate);
        } else {
          console.log('ICE gathering complete');
          resolve();
        }
      };
    });

    dataChannel.addEventListener('open', event => {
      console.log("Data channel is open and ready to be used.");
      dataChannel.send(JSON.stringify({ msg: "Hello from Node.js Peer!" }));
    });
  
    // Disable input when closed
    dataChannel.addEventListener('close', event => {
      console.log("Data channel is closed.");
    });

    dataChannel.addEventListener('message', event => {
      console.log("Received Message:", event.data);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await icePromise;

    return {
      offer: peerConnection.localDescription,
      peerConnection,
      dataChannel,
    };
  } catch(error) {
    console.error("Error creating offer:", error);
  }

  return null;
}

async function acceptAnswer(answer, peerConnection) {
  try {
    await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(answer));
  } catch(error) {
    console.error("Error accepting answer:", error);
  }

  return null;
}

module.exports = {
  createOffer,
  acceptAnswer,
  // localConnection,
  // remoteConnection,
  // dataChannel,
};
