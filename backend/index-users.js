// Script to index all existing users into Elasticsearch
require("dotenv").config();
const mongoose = require('mongoose');
const User = require('./src/models/Users');
const { initializeIndex, bulkIndexUsers } = require('./src/config/elasticsearch');

mongoose.connect(process.env.DB_URL)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.log('Error connecting to MongoDB:', err);
        process.exit(1);
    });

async function indexAllUsers() {
    try {
        console.log('Initializing Elasticsearch index...');
        await initializeIndex();

        console.log('Fetching all users from MongoDB...');
        const users = await User.find({}).select('-password');
        console.log(`Found ${users.length} users`);

        if (users.length > 0) {
            console.log('Indexing users into Elasticsearch...');
            await bulkIndexUsers(users);
            console.log('All users indexed successfully!');
        } else {
            console.log('No users to index');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error indexing users:', err);
        process.exit(1);
    }
}

indexAllUsers();
