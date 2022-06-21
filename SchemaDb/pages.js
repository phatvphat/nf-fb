const mongoose = require('mongoose');
const database = require('../database');

const pageSchema = new mongoose.Schema({
	page_id: String,
	name: String,
	likes: String,
	last_post_update: String
});

const page = database.main_conn.model('pages', pageSchema, 'pages');
module.exports = page;