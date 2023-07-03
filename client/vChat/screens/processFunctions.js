
export async function processCall(otherUserId, peerConnection) {
    console.alert(otherUserId)
    const sessionDescription = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(sessionDescription);
    sendCall({
      calleeId: otherUserId.current,
      rtcMessage: sessionDescription,
    });
  }

  export async function processAccept(otherUserId, peerConnection) {
    peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(remoteRTCMessage.current),
    );
    const sessionDescription = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(sessionDescription);
    answerCall({
      callerId: otherUserId.current,
      rtcMessage: sessionDescription,
    });
  }

  function answerCall(data) {
    socket.emit('answerCall', data);
  }

  function sendCall(data) {
    socket.emit('call', data);
  }