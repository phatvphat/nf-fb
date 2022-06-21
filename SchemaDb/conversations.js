const mongoose = require('mongoose');
const database = require('../database');

const chatSchema = new mongoose.Schema({ uid_fb: String, message: String, datetime: String });

const chat = database.main_conn.model('conversations', chatSchema, 'conversations');
module.exports = chat;