const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    content: String,
    file: String,
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ author: 1, createdAt: -1, _id: -1 });
postSchema.index({ likes: 1 });

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
