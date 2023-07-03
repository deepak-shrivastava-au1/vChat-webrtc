import React, {useEffect, useState, useRef} from 'react';
import SocketIOClient from 'socket.io-client'; // import socket io
// import WebRTC
import {
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import JoinScreen from './screens/JoinScreen';
import IncomingCallScreen from './screens/IncomingCallScreen';
import OutgoingCallScreen from './screens/OutgoingCallScreen';
import WebrtcRoomScreen from './screens/WebrtcRoomScreen';
import { GoogleSignin } from '@react-native-community/google-signin';

export default function App({}) {
  const [localStream, setlocalStream] = useState(null);

  const [remoteStream, setRemoteStream] = useState(null);

  const [type, setType] = useState('JOIN');

  const [callerId] = useState(
    Math.floor(100000 + Math.random() * 900000).toString(),
  );
  const otherUserId = useRef(null);

  const socket = SocketIOClient('http://192.168.1.10:3500', {
    transports: ['websocket'],
    query: {
      callerId,
    },
  });

  useEffect(() => {
    // Initialize Google Sign-In
    GoogleSignin.configure({
      scopes: ['email'],
      webClientId: 'YOUR_WEB_CLIENT_ID', // Add your web client ID here
      offlineAccess: true,
    });
  }, []);


  const peerConnection = useRef(
    new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
        {
          urls: 'stun:stun1.l.google.com:19302',
        },
        {
          urls: 'stun:stun2.l.google.com:19302',
        },
      ],
    }),
  );

  let remoteRTCMessage = useRef(null);

  useEffect(() => {
    socket.on('newCall', data => {
      remoteRTCMessage.current = data.rtcMessage;
      otherUserId.current = data.callerId;
      setType('INCOMING_CALL');
    });

    socket.on('callAnswered', data => {
      remoteRTCMessage.current = data.rtcMessage;
      peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(remoteRTCMessage.current),
      );
      setType('WEBRTC_ROOM');
    });

    socket.on('ICEcandidate', data => {
      let message = data.rtcMessage;

      if (peerConnection.current) {
        peerConnection?.current
          .addIceCandidate(
            new RTCIceCandidate({
              candidate: message.candidate,
              sdpMid: message.id,
              sdpMLineIndex: message.label,
            }),
          )
          .then(data => {
            console.log('SUCCESS');
          })
          .catch(err => {
            console.log('Error', err);
          });
      }
    });

    let isFront = false;

    mediaDevices.enumerateDevices().then(sourceInfos => {
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (
          sourceInfo.kind == 'videoinput' &&
          sourceInfo.facing == (isFront ? 'user' : 'environment')
        ) {
          videoSourceId = sourceInfo.deviceId;
        }
      }

      mediaDevices
        .getUserMedia({
          audio: true,
          video: {
            mandatory: {
              minWidth: 500, // Provide your own width, height and frame rate here
              minHeight: 300,
              minFrameRate: 30,
            },
            facingMode: isFront ? 'user' : 'environment',
            optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
          },
        })
        .then(stream => {
          // Got stream!

          setlocalStream(stream);

          // setup stream listening
          peerConnection.current.addStream(stream);
        })
        .catch(error => {
          // Log error
        });
    });

    peerConnection.current.onaddstream = event => {
      setRemoteStream(event.stream);
    };

    // Setup ice handling
    peerConnection.current.onicecandidate = event => {
      if (event.candidate) {
        sendICEcandidate({
          calleeId: otherUserId.current,
          rtcMessage: {
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
          },
        });
      } else {
        console.log('End of candidates.');
      }
    };

    return () => {
      socket.off('newCall');
      socket.off('callAnswered');
      socket.off('ICEcandidate');
    };
  }, [socket]);

  useEffect(() => {
    InCallManager.start();
    InCallManager.setKeepScreenOn(true);
    InCallManager.setForceSpeakerphoneOn(true);

    return () => {
      InCallManager.stop();
    };
  }, []);

  function sendICEcandidate(data) {
    socket.emit('ICEcandidate', data);
  }

  switch (type) {
    case 'JOIN':
      return (
        <JoinScreen
          setType={setType}
          callerId={callerId}
          otherUserId={otherUserId}
          peerConnection={peerConnection}
        />
      );
    case 'INCOMING_CALL':
      return <IncomingCallScreen setType={setType} otherUserId={otherUserId} peerConnection={peerConnection} />;
    case 'OUTGOING_CALL':
      return <OutgoingCallScreen setType={setType} otherUserId={otherUserId} />;
    case 'WEBRTC_ROOM':
      return (
        <WebrtcRoomScreen
          setType={setType}
          localStream={localStream}
          setlocalStream={setlocalStream}
          remoteStream={remoteStream}
        />
      );
    default:
      return null;
  }
}
