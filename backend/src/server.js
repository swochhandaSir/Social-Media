require("dotenv").config();

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const User = require('./models/Users');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Message = require('./models/Message');
const Call = require('./models/Call');
const { initializeIndex, searchUsers, indexUser } = require('./config/elasticsearch');

const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Helmet (Sets various HTTP headers)
app.use(helmet());

// Security: Rate Limiting (100 requests per 15 mins)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Security: CORS (Restrict to frontend domain)
// Security: CORS (Restrict to frontend domain)
const allowedOrigins = [
    'http://localhost:3000',
    'https://sabpara.vercel.app',
    'https://sab-para.onrender.com',
    process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});

// Security: File Upload Restrictions
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

mongoose.connect(process.env.DB_URL)
    .then(() => {
        console.log('MongoDB connected');
        initializeIndex().catch(err => console.error('Elasticsearch initialization error:', err));
    })
    .catch(err => console.log(err));

app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

// Get all posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('author', 'userName')
            .populate({ path: 'comments', populate: { path: 'author', select: 'userName' } })
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create a post
app.post('/api/posts', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { content } = req.body;
        const file = req.file ? req.file.filename : undefined;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const post = new Post({
            title: '', // Title was removed from frontend, removed from schema? No, schema might still have it but we don't send it.
            content,
            file,
            author: req.user.userId // Save author
        });

        await post.save();
        res.status(201).json(post);
    } catch (err) {
        console.error('error creating post', err);
        res.status(500).json({ error: err.message });
    }
});

// Like/Unlike a post
app.post('/api/posts/like/:postId', authMiddleware, async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.user.userId;
        const post = await Post.findById(postId)
            .populate('author', 'userName')
            .populate({ path: 'comments', populate: { path: 'author', select: 'userName' } });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if user already liked the post
        const likeIndex = post.likes.indexOf(userId);
        if (likeIndex === -1) {
            // User hasn't liked it, so add like
            post.likes.push(userId);
        } else {
            // User already liked it, so remove like (unlike)
            post.likes.splice(likeIndex, 1);
        }

        await post.save();
        res.json(post);
    } catch (err) {
        console.error('error liking post', err);
        res.status(500).json({ error: err.message });
    }
});

// Add a comment
app.post('/api/posts/comment/:postId', authMiddleware, async (req, res) => {
    try {
        const postId = req.params.postId;
        const { text } = req.body;
        const userId = req.user.userId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Create new comment document
        const comment = new Comment({
            text,
            author: userId,
            post: postId
        });
        await comment.save();

        // Add comment reference to post
        post.comments.push(comment._id);
        await post.save();

        // Return populated post
        const updatedPost = await Post.findById(postId)
            .populate('author', 'userName')
            .populate({ path: 'comments', populate: { path: 'author', select: 'userName' } });

        res.json(updatedPost);
    } catch (err) {
        console.error('error adding comment', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a post
app.delete('/api/posts/:postId', authMiddleware, async (req, res) => {
    try {
        const postId = req.params.postId;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check ownership
        if (post.author.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await Post.findByIdAndDelete(postId);
        res.json({ message: 'Post deleted' });
    } catch (err) {
        console.error('error deleting post', err);
        res.status(500).json({ error: err.message });
    }
});

// Get User Profile
app.get('/api/users/profile/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const posts = await Post.find({ author: userId })
            .populate('author', 'userName')
            .populate({ path: 'comments', populate: { path: 'author', select: 'userName' } })
            .sort({ createdAt: -1 });
        res.json({ user, posts });
    } catch (err) {
        console.error('error fetching profile', err);
        res.status(500).json({ error: err.message });
    }
});

// Search for users
app.get('/api/users/search', authMiddleware, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.json([]);
        }

        // Search using Elasticsearch
        const results = await searchUsers(q);

        // Get full user details from MongoDB
        const userIds = results.map(r => r.id);
        const users = await User.find({ _id: { $in: userIds } }).select('-password');

        // Sort by Elasticsearch score
        const sortedUsers = results.map(result => {
            const user = users.find(u => u._id.toString() === result.id);
            return user ? { ...user.toObject(), score: result.score } : null;
        }).filter(u => u !== null);

        res.json(sortedUsers);
    } catch (err) {
        console.error('error searching users', err);
        // Fallback to MongoDB search if Elasticsearch fails
        try {
            const { q } = req.query;
            const users = await User.find({
                $or: [
                    { userName: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } }
                ]
            }).select('-password').limit(10);
            res.json(users);
        } catch (fallbackErr) {
            res.status(500).json({ error: 'Search failed' });
        }
    }
});


// Get messages for a conversation
app.get('/api/messages/:userId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const otherUserId = req.params.userId;

        // Create conversation ID (consistent ordering)
        const conversationId = [currentUserId, otherUserId].sort().join('_');

        const messages = await Message.find({ conversationId })
            .populate('sender', 'userName')
            .populate('receiver', 'userName')
            .sort({ createdAt: 1 })
            .limit(100);

        res.json(messages);
    } catch (err) {
        console.error('error fetching messages', err);
        res.status(500).json({ error: err.message });
    }
});

// Mark messages as read
app.put('/api/messages/read/:userId', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const otherUserId = req.params.userId;
        const conversationId = [currentUserId, otherUserId].sort().join('_');

        await Message.updateMany(
            { conversationId, receiver: currentUserId, read: false },
            { read: true }
        );

        res.json({ success: true });
    } catch (err) {
        console.error('error marking messages as read', err);
        res.status(500).json({ error: err.message });
    }
});

// Get conversation list
app.get('/api/conversations', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        const messages = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { receiver: new mongoose.Types.ObjectId(userId) }]
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$conversationId',
                    lastMessage: { $first: '$$ROOT' }
                }
            }
        ]);

        const conversations = await Promise.all(messages.map(async (conv) => {
            const msg = conv.lastMessage;
            const otherUserId = msg.sender.toString() === userId ? msg.receiver : msg.sender;
            const otherUser = await User.findById(otherUserId).select('userName email');

            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                receiver: userId,
                read: false
            });

            return {
                conversationId: conv._id,
                otherUser,
                lastMessage: msg,
                unreadCount
            };
        }));

        res.json(conversations);
    } catch (err) {
        console.error('error fetching conversations', err);
        res.status(500).json({ error: err.message });
    }
});

// Get call history
app.get('/api/calls', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const calls = await Call.find({
            $or: [{ caller: userId }, { receiver: userId }]
        })
            .populate('caller', 'userName')
            .populate('receiver', 'userName')
            .sort({ createdAt: -1 });
        res.json(calls);
    } catch (err) {
        console.error('error fetching calls', err);
        res.status(500).json({ error: err.message });
    }
});

// Save a call record
app.post('/api/calls', authMiddleware, async (req, res) => {
    try {
        const { receiverId, type, status, duration } = req.body;
        const callerId = req.user.userId;

        const call = new Call({
            caller: callerId,
            receiver: receiverId,
            type,
            status,
            duration
        });

        await call.save();
        res.status(201).json(call);
    } catch (err) {
        console.error('error saving call', err);
        res.status(500).json({ error: err.message });
    }
});

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO with CORS
// Setup Socket.IO with CORS
const io = socketIO(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Store online users and their socket IDs
const onlineUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // User joins
    socket.on('user-online', (userId) => {
        onlineUsers.set(userId, socket.id);
        console.log(`User ${userId} is online`);
        io.emit('user-status', { userId, online: true });
    });

    // Send message
    socket.on('send-message', async (data) => {
        try {
            const { sender, receiver, text } = data;
            const conversationId = [sender, receiver].sort().join('_');

            const message = new Message({
                sender,
                receiver,
                text,
                conversationId
            });

            await message.save();
            await message.populate('sender', 'userName');
            await message.populate('receiver', 'userName');

            // Send to receiver if online
            const receiverSocketId = onlineUsers.get(receiver);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('receive-message', message);
            }

            // Send back to sender for confirmation
            socket.emit('message-sent', message);
        } catch (err) {
            console.error('Error sending message:', err);
            socket.emit('message-error', { error: err.message });
        }
    });

    // WebRTC signaling
    socket.on('call-user', (data) => {
        const { userToCall, signalData, from, name } = data;
        const receiverSocketId = onlineUsers.get(userToCall);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('incoming-call', {
                signal: signalData,
                from,
                name
            });
        }
    });

    socket.on('answer-call', (data) => {
        const { to, signal } = data;
        const callerSocketId = onlineUsers.get(to);
        if (callerSocketId) {
            io.to(callerSocketId).emit('call-accepted', signal);
        }
    });

    socket.on('reject-call', (data) => {
        const { to } = data;
        const callerSocketId = onlineUsers.get(to);
        if (callerSocketId) {
            io.to(callerSocketId).emit('call-rejected');
        }
    });

    socket.on('end-call', (data) => {
        const { to } = data;
        const otherSocketId = onlineUsers.get(to);
        if (otherSocketId) {
            io.to(otherSocketId).emit('call-ended');
        }
    });

    // Typing indicator
    socket.on('typing', (data) => {
        const { to } = data;
        const receiverSocketId = onlineUsers.get(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('user-typing', data);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Find and remove user from online users
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                io.emit('user-status', { userId, online: false });
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
