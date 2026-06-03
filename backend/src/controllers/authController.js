const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { indexUser } = require('../config/elasticsearch');

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const getRefreshTokenSecret = () => process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/api/auth',
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createAccessToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

const createRefreshToken = (userId) => {
    const refreshSecret = getRefreshTokenSecret();

    if (!refreshSecret) {
        throw new Error('REFRESH_TOKEN_SECRET or JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign({ userId, tokenId: crypto.randomUUID() }, refreshSecret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

const attachRefreshToken = async (res, user) => {
    const refreshToken = createRefreshToken(user._id);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

    user.refreshTokens = (user.refreshTokens || []).filter(token => token.expiresAt > new Date());
    user.refreshTokens.push({
        tokenHash: hashToken(refreshToken),
        expiresAt,
    });

    await user.save();
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, getCookieOptions());
};

const clearRefreshCookie = (res) => {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
        ...getCookieOptions(),
        maxAge: undefined,
    });
};

const sendAuthResponse = async (res, user, statusCode = 200) => {
    const token = createAccessToken(user._id);
    await attachRefreshToken(res, user);
    res.status(statusCode).json({ token, userId: user._id, userName: user.userName });
};

exports.register = async (req, res) => {
    try {
        const { userName, email, password } = req.body;

        if (!userName || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { userName }] });
        if (existingUser) {
            const field = existingUser.email === email ? 'Email' : 'Username';
            return res.status(400).json({ message: `${field} already exists` });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            userName,
            email,
            password: hashedPassword
        });

        await user.save();

        // Index user in Elasticsearch
        try {
            await indexUser(user);
        } catch (esError) {
            console.error('Error indexing user in Elasticsearch:', esError);
            // Don't fail registration if Elasticsearch indexing fails
        }

        await sendAuthResponse(res, user, 201);
    } catch (error) {
        console.error('Register error:', error);
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(err => err.message).join(', ');
            return res.status(400).json({ message });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account was found with that email address.' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password is incorrect. Please try again.' });
        }

        await sendAuthResponse(res, user);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token is required' });
        }

        const decoded = jwt.verify(refreshToken, getRefreshTokenSecret());
        const tokenHash = hashToken(refreshToken);
        const user = await User.findById(decoded.userId);

        if (!user) {
            clearRefreshCookie(res);
            return res.status(401).json({ message: 'Refresh token is not valid' });
        }

        const now = new Date();
        const storedToken = (user.refreshTokens || []).find(token => token.tokenHash === tokenHash);

        if (!storedToken || storedToken.expiresAt <= now) {
            user.refreshTokens = [];
            await user.save();
            clearRefreshCookie(res);
            return res.status(401).json({ message: 'Refresh token has been revoked' });
        }

        user.refreshTokens = user.refreshTokens.filter(token => token.tokenHash !== tokenHash && token.expiresAt > now);
        const accessToken = createAccessToken(user._id);
        await attachRefreshToken(res, user);

        res.json({ token: accessToken, userId: user._id, userName: user.userName });
    } catch (error) {
        clearRefreshCookie(res);
        res.status(401).json({ message: 'Refresh token is not valid' });
    }
};

exports.logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

        if (refreshToken) {
            const tokenHash = hashToken(refreshToken);
            await User.updateOne(
                { 'refreshTokens.tokenHash': tokenHash },
                { $pull: { refreshTokens: { tokenHash } } }
            );
        }

        clearRefreshCookie(res);
        res.json({ message: 'Logged out' });
    } catch (error) {
        clearRefreshCookie(res);
        res.json({ message: 'Logged out' });
    }
};
