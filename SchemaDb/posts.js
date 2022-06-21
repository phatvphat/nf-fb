const mongoose = require('mongoose');
const database = require('../database');

const pageSchema = new mongoose.Schema({
	post_id: String,
	page_id: String,
	time: String,
	source: String,
	content: String,
	statistics: Array
});

const page = database.main_conn.model('posts', pageSchema, 'posts');
module.exports = page;