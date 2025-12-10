const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    content: String,
    file: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Post = mongoose.model("Post", postSchema);

module.exports = Post;