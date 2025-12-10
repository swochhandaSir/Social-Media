// Migration script to convert likes from numbers back to empty arrays
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
    comments: mongoose.Schema.Types.Mixed,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, strict: false });

const Post = mongoose.model('Post', PostSchema);

async function migrateData() {
    try {
        console.log('Starting migration to convert likes to arrays...');

        const posts = await Post.find({});
        console.log(`Found ${posts.length} posts to migrate`);

        for (let post of posts) {
            let updated = false;

            // Convert numeric likes to empty array
            if (typeof post.likes === 'number') {
                post.likes = [];
                updated = true;
                console.log(`Post ${post._id}: Converted numeric likes to empty array`);
            } else if (!Array.isArray(post.likes)) {
                post.likes = [];
                updated = true;
                console.log(`Post ${post._id}: Set likes to empty array`);
            }

            if (updated) {
                await post.save();
                console.log(`Post ${post._id}: Updated successfully`);
            }
        }

        console.log('Migration completed successfully!');
        console.log('Note: All posts now have empty likes arrays. Users will need to like posts again.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrateData();
