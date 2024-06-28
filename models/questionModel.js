const mongoose = require('mongoose');

const questionSchema = mongoose.Schema(
    {
        content: {
            type: String,
            required: [true, "Please enter a question"]
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, "User reference is required"]
        }
    },
    {
        timestamps: true
    }
);

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;