const mongoose = require('mongoose');

const RestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    available_seats: {
        type: Number,
        required: true
    }
},{
    collection:"rest"
});

module.exports = mongoose.model('Rest', RestSchema);