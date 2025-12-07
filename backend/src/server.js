require("dotenv").config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const User = require('./models/Users');

const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage: storage });

mongoose.connect(process.env.DB_URL)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const PostSchema = new mongoose.Schema({
    title: String,
    content: String,
    file: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    comments: [{ text: String }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Post = mongoose.model('Post', PostSchema);

app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

// Get all posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().populate('author', 'userName').sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create a post
app.post('/api/posts', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { title, content } = req.body;
        const file = req.file ? req.file.filename : undefined;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const post = new Post({
            title,
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
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const index = post.likes.indexOf(userId);
        if (index === -1) {
            post.likes.push(userId); // Like
        } else {
            post.likes.splice(index, 1); // Unlike
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
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.comments.push({ text });
        await post.save();

        res.json(post);
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
        const posts = await Post.find({ author: userId }).sort({ createdAt: -1 });
        res.json({ user, posts });
    } catch (err) {
        console.error('error fetching profile', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
