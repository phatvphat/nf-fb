const dbUsers = require('./SchemaDb/users');
const dbPages = require('./SchemaDb/pages');
const dbPosts = require('./SchemaDb/posts');
const dbConversations = require('./SchemaDb/conversations');

var db = module.exports = {}

db.getUsers = async () => { return await dbUsers.find({}, (err, users) => { }) }
db.getUser = async (user_id) => { return await dbUsers.findOne({ user_id: user_id }, (err, user) => { }) }

db.getPages = async () => { return await dbPages.find({}, (err, pages) => { }) }
db.getPages_ = async (page_ids) => { return await dbPages.find({ page_id: { $in: page_ids } }, (err, pages) => { }) }
db.getPage = async (page_id) => { return await dbPages.findOne({ page_id: page_id }, (err, page) => { }) }

db.getPosts = async () => { return await dbPosts.find({}, (err, posts) => { }) }
db.getPost = async (post_id) => { return await dbPosts.findOne({ post_id: post_id }, (err, post) => { }) }
db.getPostsFromPage = async (page_id) => { return await dbPosts.find({ page_id: page_id }, (err, posts) => { }) }
db.getPostsFromPages = async (page_ids, sort = { time: 'desc' }) => { return new Promise(resolve => { dbPosts.find({ page_id: { $in: page_ids } }).sort(sort).exec(function (err, docs) { resolve(docs) }) }) }

db.getConversations = async () => { return await dbConversations.find({}, (err, conversations) => { }) }
