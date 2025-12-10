# WebRTC & WebSocket Real-Time Features

## Overview

This social media application now includes real-time messaging and video calling capabilities powered by WebSockets (Socket.IO) and WebRTC.

## Features

### 🔴 Real-Time Messaging
- **Instant messaging** between users
- **Typing indicators** to show when someone is typing
- **Online status** indicators
- **Unread message counts**
- **Message persistence** - all messages saved to MongoDB
- **Conversation list** - view all your chats in one place

### 📹 Video Calling
- **Peer-to-peer video calls** using WebRTC
- **Audio/Video controls** - mute/unmute, video on/off
- **Call notifications** - incoming call alerts
- **Call management** - accept, reject, or end calls
- **Picture-in-picture** layout for video streams

## Architecture

### Backend (Socket.IO Server)
- **WebSocket server** on port 5000
- **Signaling server** for WebRTC connections
- **Message storage** in MongoDB
- **Online user tracking**

### Frontend (React + Socket.IO Client)
- **SocketContext** - manages WebSocket connection
- **Chat component** - real-time messaging UI
- **VideoCall component** - WebRTC video calling UI
- **Messages page** - conversation list

## How It Works

### Real-Time Messaging

1. **Connection**: When a user logs in, they connect to the Socket.IO server
2. **Sending Messages**: Messages are sent via WebSocket and saved to MongoDB
3. **Receiving Messages**: Real-time delivery to online users
4. **Offline Messages**: Stored in database and delivered when user comes online

### Video Calling (WebRTC)

1. **Initiating Call**: Caller creates a peer connection and sends offer signal
2. **Signaling**: Socket.IO server relays WebRTC signals between peers
3. **Connection**: Direct peer-to-peer connection established
4. **Media Streams**: Audio/video streams exchanged directly between peers
5. **Call Controls**: Mute, video toggle, and end call functionality

## Usage

### Starting a Chat

1. Go to **Messages** page
2. Click on a conversation to open chat
3. Type your message and press Send
4. Messages appear in real-time

### Making a Video Call

1. From the **Messages** page, click the video icon (📹) next to a conversation
2. Or open a chat and click the video call button
3. Wait for the other user to accept
4. Use controls to mute/unmute or turn video on/off
5. Click "End Call" to disconnect

### Search and Message New Users

1. Use the search bar to find users
2. Click on a user to view their profile
3. Click "Message" to start a conversation
4. Click "Video Call" to initiate a call

## API Endpoints

### Messages

#### Get Messages
```
GET /api/messages/:userId
Authorization: Bearer <token>
```
Returns all messages in a conversation with the specified user.

#### Get Conversations
```
GET /api/conversations
Authorization: Bearer <token>
```
Returns list of all conversations with unread counts.

#### Mark as Read
```
PUT /api/messages/read/:userId
Authorization: Bearer <token>
```
Marks all messages from a user as read.

## Socket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `user-online` | `userId` | User comes online |
| `send-message` | `{ sender, receiver, text }` | Send a message |
| `call-user` | `{ userToCall, signalData, from, name }` | Initiate video call |
| `answer-call` | `{ to, signal }` | Accept video call |
| `reject-call` | `{ to }` | Reject video call |
| `end-call` | `{ to }` | End video call |
| `typing` | `{ to, from }` | Typing indicator |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `user-status` | `{ userId, online }` | User online/offline status |
| `receive-message` | `message` | New message received |
| `message-sent` | `message` | Message sent confirmation |
| `incoming-call` | `{ signal, from, name }` | Incoming video call |
| `call-accepted` | `signal` | Call was accepted |
| `call-rejected` | - | Call was rejected |
| `call-ended` | - | Call was ended |
| `user-typing` | `{ from }` | User is typing |

## Browser Requirements

### WebRTC Support
- Chrome 56+
- Firefox 44+
- Safari 11+
- Edge 79+

### Required Permissions
- **Camera** access for video calls
- **Microphone** access for audio
- **Notifications** (optional) for call alerts

## Security Considerations

1. **Authentication**: All Socket.IO connections require valid JWT token
2. **Message Validation**: Server validates sender/receiver IDs
3. **CORS**: Configured for localhost:3000 (update for production)
4. **Peer-to-Peer**: Video/audio streams are direct P2P (not through server)

## Troubleshooting

### Messages Not Sending
- Check if Socket.IO connection is established (browser console)
- Verify backend server is running
- Check authentication token is valid

### Video Call Not Working
- Ensure camera/microphone permissions are granted
- Check if both users are online
- Verify WebRTC is supported in your browser
- Check firewall/NAT settings (may need TURN server for some networks)

### Connection Issues
- Verify Socket.IO server is running on port 5000
- Check CORS settings match your frontend URL
- Look for errors in browser console and server logs

## Production Deployment

### Environment Variables
```env
PORT=5000
DB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### CORS Configuration
Update in `server.js`:
```javascript
const io = socketIO(server, {
    cors: {
        origin: "https://your-production-domain.com",
        methods: ["GET", "POST"]
    }
});
```

### TURN Server (for NAT traversal)
For production, you may need a TURN server for WebRTC connections behind NAT/firewalls. Consider services like:
- Twilio TURN
- Xirsys
- Self-hosted coturn

Update `VideoCall.js`:
```javascript
const peer = new Peer({
    initiator: true,
    trickle: false,
    stream: stream,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
                urls: 'turn:your-turn-server.com:3478',
                username: 'username',
                credential: 'password'
            }
        ]
    }
});
```

## Future Enhancements

- [ ] Group video calls
- [ ] Screen sharing
- [ ] File sharing in chat
- [ ] Voice messages
- [ ] Message reactions
- [ ] Read receipts
- [ ] Push notifications
- [ ] Chat encryption (E2E)
- [ ] Call recording
- [ ] Chat history export
