const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    userName: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: props => `${props.value} is not a valid email address!`,
        },
    },
    password: {
        type: String,
        required: true,
        minlength: [6, "Password must be at least 6 characters long"],
    },
    following: mongoose.Schema.Types.ObjectId,
    followers: mongoose.Schema.Types.ObjectId,
});

const user = mongoose.model("User", userSchema);

module.exports = user;