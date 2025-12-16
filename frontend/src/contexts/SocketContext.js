import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { API_URL } from '../apiConfig';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    useEffect(() => {
        const userId = localStorage.getItem('userId');

        if (userId) {
            const newSocket = io(API_URL);

            newSocket.on('connect', () => {
                console.log('Connected to socket server');
                newSocket.emit('user-online', userId);
            });

            newSocket.on('user-status', ({ userId, online }) => {
                setOnlineUsers(prev => {
                    const newSet = new Set(prev);
                    if (online) {
                        newSet.add(userId);
                    } else {
                        newSet.delete(userId);
                    }
                    return newSet;
                });
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        }
    }, []);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
