import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import VideoCall from './VideoCall';

const GlobalCallListener = () => {
    const { socket } = useSocket();
    const [incomingCall, setIncomingCall] = useState(null);
    const [isCallActive, setIsCallActive] = useState(false);

    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = (data) => {
            setIncomingCall(data);
            setIsCallActive(true);
        };

        socket.on('incoming-call', handleIncomingCall);

        return () => {
            socket.off('incoming-call', handleIncomingCall);
        };
    }, [socket]);

    const handleClose = () => {
        setIsCallActive(false);
        setIncomingCall(null);
    };

    if (!isCallActive || !incomingCall) return null;

    return (
        <VideoCall
            incomingCallData={incomingCall}
            onClose={handleClose}
        />
    );
};

export default GlobalCallListener;
