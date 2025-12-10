const { Client } = require('@elastic/elasticsearch');

const client = new Client({
    node: 'https://ed9c847112704152aa69e2e5ac4bd313.us-central1.gcp.cloud.es.io:443',
    auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY
    },
});

const index = 'search-3qkj';

// Initialize Elasticsearch index with mapping
async function initializeIndex() {
    try {
        // Check if index exists
        const indexExists = await client.indices.exists({ index });

        if (!indexExists) {
            console.log(`Creating index: ${index}`);
            await client.indices.create({ index });
        }

        // Update mapping
        const mapping = {
            "userName": {
                "type": "text",
                "fields": {
                    "keyword": {
                        "type": "keyword"
                    }
                }
            },
            "email": {
                "type": "text",
                "fields": {
                    "keyword": {
                        "type": "keyword"
                    }
                }
            },
            "bio": {
                "type": "text"
            }
        };

        const updateMappingResponse = await client.indices.putMapping({
            index,
            properties: mapping,
        });

        console.log('Elasticsearch mapping updated:', updateMappingResponse);
    } catch (error) {
        console.error('Error initializing Elasticsearch index:', error);
    }
}

// Index a user document
async function indexUser(user) {
    try {
        const response = await client.index({
            index,
            id: user._id.toString(),
            document: {
                userName: user.userName,
                email: user.email,
                bio: user.bio || '',
                createdAt: user.createdAt || new Date()
            },
            refresh: true
        });
        console.log(`User ${user.userName} indexed successfully`);
        return response;
    } catch (error) {
        console.error('Error indexing user:', error);
        throw error;
    }
}

// Search for users
async function searchUsers(query) {
    try {
        const response = await client.search({
            index,
            body: {
                query: {
                    multi_match: {
                        query: query,
                        fields: ['userName^2', 'email', 'bio'],
                        fuzziness: 'AUTO'
                    }
                }
            }
        });

        return response.hits.hits.map(hit => ({
            id: hit._id,
            score: hit._score,
            ...hit._source
        }));
    } catch (error) {
        console.error('Error searching users:', error);
        throw error;
    }
}

// Delete a user from index
async function deleteUser(userId) {
    try {
        await client.delete({
            index,
            id: userId.toString(),
            refresh: true
        });
        console.log(`User ${userId} deleted from index`);
    } catch (error) {
        if (error.meta?.statusCode !== 404) {
            console.error('Error deleting user from index:', error);
        }
    }
}

// Bulk index all users
async function bulkIndexUsers(users) {
    try {
        const operations = users.flatMap(user => [
            { index: { _index: index, _id: user._id.toString() } },
            {
                userName: user.userName,
                email: user.email,
                bio: user.bio || '',
                createdAt: user.createdAt || new Date()
            }
        ]);

        const response = await client.bulk({
            refresh: true,
            operations
        });

        if (response.errors) {
            console.error('Bulk indexing had errors');
        } else {
            console.log(`Successfully indexed ${users.length} users`);
        }

        return response;
    } catch (error) {
        console.error('Error bulk indexing users:', error);
        throw error;
    }
}

module.exports = {
    client,
    initializeIndex,
    indexUser,
    searchUsers,
    deleteUser,
    bulkIndexUsers
};
