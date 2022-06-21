const mongoose = require('mongoose');
const database = require('../database');

const userSchema = new mongoose.Schema({
	user_id: String,
	name: String,
	fb_cookie: String,
	page_ids: [String],
	access: Boolean,
	admin: Boolean,
	date_joined: String,
	last_online: String
});

const user = database.main_conn.model('users', userSchema, 'users');
module.exports = user;