import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import axios from 'axios';
import { API_URL } from '../apiConfig';
import { useSocket } from '../contexts/SocketContext';
import './VideoCall.css';

function VideoCall({ otherUser, onClose, incomingCallData }) {
    const [stream, setStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(!!incomingCallData);
    const [caller, setCaller] = useState(incomingCallData?.from || '');
    const [callerSignal, setCallerSignal] = useState(incomingCallData?.signal || null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();
    const startTime = useRef(null);
    const { socket } = useSocket();
    const currentUserId = localStorage.getItem('userId');
    const currentUserName = localStorage.getItem('userName');

    // Derive otherUser from incomingCallData if not provided
    const targetUser = otherUser || (incomingCallData ? {
        _id: incomingCallData.from,
        userName: incomingCallData.name
    } : null);

    const isInitiator = !incomingCallData;

    useEffect(() => {
        // Get user media
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }
            })
            .catch((error) => {
                console.error('Error accessing media devices:', error);
                alert('Could not access camera/microphone. Please check permissions.');
            });

        if (socket) {
            socket.on('incoming-call', ({ from, name: callerName, signal }) => {
                setReceivingCall(true);
                setCaller(from);
                setCallerSignal(signal);
            });

            socket.on('call-accepted', (signal) => {
                setCallAccepted(true);
                startTime.current = Date.now();
                connectionRef.current.signal(signal);
            });

            socket.on('call-rejected', () => {
                alert('Call was rejected');
                endCall('rejected');
            });

            socket.on('call-ended', () => {
                endCall();
            });
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (socket) {
                socket.off('incoming-call');
                socket.off('call-accepted');
                socket.off('call-rejected');
                socket.off('call-ended');
            }
        };
    }, [socket]);

    const callUser = () => {
        if (connectionRef.current) return; // Prevent duplicate call

        if (!stream) {
            console.error('No video stream available yet!');
            alert("Please wait for camera to load...");
            return;
        }

        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
            config: {
                iceServers: [
                    {
                        urls: "stun:stun.relay.metered.ca:80",
                    },
                    {
                        urls: "turn:global.relay.metered.ca:80",
                        username: "3b692ac82963bb4296da8f28",
                        credential: "zom+h9QF0zBfVa6p",
                    },
                    {
                        urls: "turn:global.relay.metered.ca:80?transport=tcp",
                        username: "3b692ac82963bb4296da8f28",
                        credential: "zom+h9QF0zBfVa6p",
                    },
                    {
                        urls: "turn:global.relay.metered.ca:443",
                        username: "3b692ac82963bb4296da8f28",
                        credential: "zom+h9QF0zBfVa6p",
                    },
                    {
                        urls: "turns:global.relay.metered.ca:443?transport=tcp",
                        username: "3b692ac82963bb4296da8f28",
                        credential: "zom+h9QF0zBfVa6p",
                    },
                ]
            }
        });

        peer.on('signal', (data) => {
            socket.emit('call-user', {
                userToCall: targetUser._id,
                signalData: data,
                from: currentUserId,
                name: currentUserName
            });
        });

        peer.on('stream', (currentStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        connectionRef.current = peer;
    };

    const answerCall = () => {
        if (connectionRef.current) return; // Prevent duplicate answer

        setCallAccepted(true);
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
            config: {
                iceServers: [
                    {
                        urls: "stun:stun.relay.metered.ca:80",
                    },
                    {
                        urls: "turn:global.relay.metered.ca:80",
                        username: "3b692ac82963bb4296da8f28",
                        credential: "zom+h9QF0zBfVa6p",
                    },
                    {
                        urls: "turn:global.relay.metered.ca:80?transport=tcp",
                        username: "3b692ac82963bb4296da8f28",
                        credential: "zom+h9QF0zBfVa6p",
                    },
                    {
                        urls: "turn:global.relay.metered.ca:443",
                        username: "3b692ac82963bb4296da8f28",
                        credential: "zom+h9QF0zBfVa6p",
                    },
                    {
                        urls: "turns:global.relay.metered.ca:443?transport=tcp",
                        username: "3b692ac82963bb4296da8f28",
                        credential: "zom+h9QF0zBfVa6p",
                    },
                ]
            }
        });

        peer.on('signal', (data) => {
            socket.emit('answer-call', { signal: data, to: caller });
        });

        peer.on('stream', (currentStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        peer.signal(callerSignal);
        connectionRef.current = peer;
        setReceivingCall(false);
    };

    const rejectCall = () => {
        socket.emit('reject-call', { to: caller });
        setReceivingCall(false);
    };

    const endCall = async (reason = '') => {
        setCallEnded(true);
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        socket.emit('end-call', { to: targetUser._id });

        // Save call history if I am the initiator
        if (isInitiator) {
            const duration = startTime.current ? (Date.now() - startTime.current) / 1000 : 0;
            let status = 'missed';
            if (callAccepted) status = 'completed';
            if (reason === 'rejected') status = 'rejected';

            try {
                const token = localStorage.getItem('token');
                // Use API_URL from config
                const { API_URL } = require('../apiConfig');
                await axios.post(`${API_URL}/api/calls`, {
                    receiverId: targetUser._id,
                    type: 'video', // Defaulting to video for now
                    status,
                    duration
                }, {
                    headers: { Authorization: token }
                });
            } catch (err) {
                console.error('Error saving call history:', err);
            }
        }

        onClose();
    };

    const toggleMute = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    return (
        <div className="video-call-container">
            <div className="video-call-header">
                <h3>{targetUser?.userName}</h3>
                <button onClick={() => endCall()} className="close-call-btn">✕</button>
            </div>

            <div className="videos-container">
                {stream && (
                    <video
                        playsInline
                        muted
                        ref={myVideo}
                        autoPlay
                        className="my-video"
                    />
                )}

                {callAccepted && !callEnded && (
                    <video
                        playsInline
                        ref={userVideo}
                        autoPlay
                        className="user-video"
                    />
                )}

                {!callAccepted && !receivingCall && (
                    <div className="call-waiting">
                        <p>Calling {targetUser?.userName}...</p>
                        <div className="loading-spinner"></div>
                    </div>
                )}
            </div>

            <div className="call-controls">
                {!callAccepted && !receivingCall && (
                    <button onClick={callUser} className="control-btn call-btn">
                        📞 Call
                    </button>
                )}

                {receivingCall && !callAccepted && (
                    <div className="incoming-call">
                        <p>Incoming call from {targetUser?.userName}</p>
                        <div className="call-actions">
                            <button onClick={answerCall} className="control-btn answer-btn">
                                ✓ Answer
                            </button>
                            <button onClick={rejectCall} className="control-btn reject-btn">
                                ✕ Reject
                            </button>
                        </div>
                    </div>
                )}

                {callAccepted && !callEnded && (
                    <div className="active-call-controls">
                        <button
                            onClick={toggleMute}
                            className={`control-btn ${isMuted ? 'muted' : ''}`}
                        >
                            {isMuted ? '🔇' : '🔊'}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`control-btn ${isVideoOff ? 'video-off' : ''}`}
                        >
                            {isVideoOff ? '📹' : '📷'}
                        </button>
                        <button onClick={() => endCall()} className="control-btn end-btn">
                            📞 End Call
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VideoCall;
