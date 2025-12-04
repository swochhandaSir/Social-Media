require("dotenv").config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

mongoose.connect(process.env.DB_URL)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const PostSchema = new mongoose.Schema({
    title: String,
    content: String,
    likes: { type: Number, default: 0 },
    comments: [{ text: String }],
});

const Post = mongoose.model('Post', PostSchema);

app.use(bodyParser.json());

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find();
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/posts', upload.single('file'), async (req, res) => {
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
        });

        await post.save();

        res.status(201).json(post);
    } catch (err) {
        console.error('error creating post', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts/like/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        post.likes += 1;
        await post.save();
        res.json(post);
    } catch (err) {
        console.error('error liking post', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts/comment/:postId', async (req, res) => {
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
