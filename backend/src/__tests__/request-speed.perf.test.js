const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const { performance } = require('perf_hooks');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret';
process.env.NODE_ENV = 'test';

jest.mock('../config/elasticsearch', () => ({
    initializeIndex: jest.fn().mockResolvedValue(undefined),
    indexUser: jest.fn().mockResolvedValue(undefined),
    searchUsers: jest.fn().mockResolvedValue([]),
}));

const { app, server } = require('../server');
const User = require('../models/Users');
const Post = require('../models/Post');
const Message = require('../models/Message');
const Call = require('../models/Call');

const ITERATIONS = Number(process.env.PERF_ITERATIONS || 10);
const WARMUP_ITERATIONS = Number(process.env.PERF_WARMUP_ITERATIONS || 2);

const metrics = [];
let mongoServer;
let agent;
let authToken;
let user;
let otherUser;
let post;

const percentile = (values, p) => {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
};

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const formatMs = (value) => `${value.toFixed(1)}ms`;

const recordMetric = (name, samples) => {
    metrics.push({
        name,
        samples,
    });
};

const timed = async (fn) => {
    const start = performance.now();
    const response = await fn();
    return {
        response,
        duration: performance.now() - start,
    };
};

const runTimedRequest = async (name, expectedStatus, fn) => {
    for (let i = 0; i < WARMUP_ITERATIONS; i += 1) {
        await fn();
    }

    const samples = [];

    for (let i = 0; i < ITERATIONS; i += 1) {
        const sample = await timed(fn);
        expect(sample.response.status).toBe(expectedStatus);
        samples.push({
            status: sample.response.status,
            duration: sample.duration,
        });
    }

    recordMetric(name, samples);
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const password = await bcrypt.hash('Password123!', 10);

    user = await User.create({
        userName: 'PerfUser',
        email: 'perf@example.com',
        password,
    });

    otherUser = await User.create({
        userName: 'OtherPerfUser',
        email: 'other-perf@example.com',
        password,
    });

    post = await Post.create({
        title: '',
        content: '<p>Seed post</p>',
        author: user._id,
    });

    const conversationId = [user._id.toString(), otherUser._id.toString()].sort().join('_');
    await Message.create({
        sender: otherUser._id,
        receiver: user._id,
        text: 'Seed message',
        conversationId,
        read: false,
    });

    await Call.create({
        caller: user._id,
        receiver: otherUser._id,
        type: 'video',
        status: 'completed',
        duration: 30,
    });

    agent = request.agent(app);
    const loginResponse = await agent
        .post('/api/auth/login')
        .send({ email: 'perf@example.com', password: 'Password123!' })
        .expect(200);

    authToken = loginResponse.body.token;
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
    if (server.listening) {
        await new Promise(resolve => server.close(resolve));
    }
});

afterAll(() => {
    console.log(`\nRequest speed metrics (${ITERATIONS} iterations, ${WARMUP_ITERATIONS} warmup):`);
    console.log('Route'.padEnd(34), 'avg'.padStart(10), 'p95'.padStart(10), 'min'.padStart(10), 'max'.padStart(10));

    metrics.forEach(({ name, samples }) => {
        const durations = samples.map(sample => sample.duration);
        console.log(
            name.padEnd(34),
            formatMs(average(durations)).padStart(10),
            formatMs(percentile(durations, 95)).padStart(10),
            formatMs(Math.min(...durations)).padStart(10),
            formatMs(Math.max(...durations)).padStart(10)
        );
    });
});

describe('request speed', () => {
    test('measures auth requests', async () => {
        await runTimedRequest('POST /api/auth/login', 200, () => agent
            .post('/api/auth/login')
            .send({ email: 'perf@example.com', password: 'Password123!' }));

        await runTimedRequest('POST /api/auth/refresh-token', 200, async () => {
            const response = await agent.post('/api/auth/refresh-token');
            if (response.status === 200) {
                authToken = response.body.token;
            }
            return response;
        });
    });

    test('measures post requests', async () => {
        await runTimedRequest('GET /api/posts', 200, () => agent.get('/api/posts'));

        await runTimedRequest('POST /api/posts', 201, () => agent
            .post('/api/posts')
            .set('Authorization', authToken)
            .send({ content: '<p>Performance test post</p>' }));

        await runTimedRequest('POST /api/posts/like/:id', 200, () => agent
            .post(`/api/posts/like/${post._id}`)
            .set('Authorization', authToken));

        await runTimedRequest('POST /api/posts/comment/:id', 200, () => agent
            .post(`/api/posts/comment/${post._id}`)
            .set('Authorization', authToken)
            .send({ text: 'Performance test comment' }));
    });

    test('measures user, message, and call requests', async () => {
        await runTimedRequest('GET /api/users/profile/:id', 200, () => agent
            .get(`/api/users/profile/${user._id}`)
            .set('Authorization', authToken));

        await runTimedRequest('GET /api/users/search', 200, () => agent
            .get('/api/users/search?q=perf')
            .set('Authorization', authToken));

        await runTimedRequest('GET /api/conversations', 200, () => agent
            .get('/api/conversations')
            .set('Authorization', authToken));

        await runTimedRequest('GET /api/messages/:userId', 200, () => agent
            .get(`/api/messages/${otherUser._id}`)
            .set('Authorization', authToken));

        await runTimedRequest('PUT /api/messages/read/:userId', 200, () => agent
            .put(`/api/messages/read/${otherUser._id}`)
            .set('Authorization', authToken));

        await runTimedRequest('GET /api/calls', 200, () => agent
            .get('/api/calls')
            .set('Authorization', authToken));

        await runTimedRequest('POST /api/calls', 201, () => agent
            .post('/api/calls')
            .set('Authorization', authToken)
            .send({
                receiverId: otherUser._id,
                type: 'voice',
                status: 'completed',
                duration: 12,
            }));
    });
});
