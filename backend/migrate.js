// Migration script to update existing posts to new schema
require("dotenv").config();
const mongoose = require('mongoose');

mongoose.connect(process.env.DB_URL)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.log('Error connecting to MongoDB:', err);
        process.exit(1);
    });

const PostSchema = new mongoose.Schema({
    title: String,
    content: String,
    file: String,
    likes: mongoose.Schema.Types.Mixed, // Allow both array and number temporarily
    comments: mongoose.Schema.Types.Mixed, // Allow both formats
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, strict: false });

const Post = mongoose.model('Post', PostSchema);

async function migrateData() {
    try {
        console.log('Starting migration...');

        const posts = await Post.find({});
        console.log(`Found ${posts.length} posts to migrate`);

        for (let post of posts) {
            let updated = false;

            // Migrate likes from array to number
            if (Array.isArray(post.likes)) {
                post.likes = post.likes.length;
                updated = true;
                console.log(`Post ${post._id}: Migrated likes array (${post.likes} likes)`);
            } else if (typeof post.likes !== 'number') {
                post.likes = 0;
                updated = true;
                console.log(`Post ${post._id}: Set likes to 0`);
            }

            // Migrate comments from embedded to empty array (will need to be re-created)
            if (post.comments && post.comments.length > 0 && post.comments[0].text) {
                console.log(`Post ${post._id}: Has ${post.comments.length} old-style comments (will be cleared)`);
                post.comments = [];
                updated = true;
            } else if (!Array.isArray(post.comments)) {
                post.comments = [];
                updated = true;
            }

            if (updated) {
                await post.save();
                console.log(`Post ${post._id}: Updated successfully`);
            }
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrateData();
