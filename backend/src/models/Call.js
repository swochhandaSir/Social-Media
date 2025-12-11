const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
    caller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['voice', 'video'],
        default: 'video'
    },
    status: {
        type: String,
        enum: ['completed', 'missed', 'rejected'],
        default: 'completed'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    },
    duration: {
        type: Number, // in seconds
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Call', callSchema);
