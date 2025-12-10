const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    conversationId: { type: String, required: true, index: true }
}, { timestamps: true });

// Create index for efficient querying
messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
