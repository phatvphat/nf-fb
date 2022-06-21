const axios = require('axios');
var moment = require('moment-timezone'); moment().tz("Asia/Ho_Chi_Minh").format();
const fs = require('fs');
const jwt = require('jsonwebtoken'), password = 'PvL@2020';
const cheerio = require('cheerio');
const db = require('./db');
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server, { cors: { origin: "*", methods: ["*"] } });


const dbUsers = require('./SchemaDb/users');
const dbPages = require('./SchemaDb/pages');
const dbPosts = require('./SchemaDb/posts');
const dbConversations = require('./SchemaDb/conversations');
const page = require('./SchemaDb/pages');

var access_token = 'EAABwzLixnjYBAGzPcbmgtjR1VVTZCuxwAtywz5lQ1oGceKJpxl70LZB6KWiniiQMQ0zjdmE2w7BVjj6ulNA0gID7VBk5oNZAbRY2dfN2QckbP7m042n6kAmlqlN7EQXrNoLlxMCZCIZCBqsKGlvMvUOQaYkUfkuvrNU8VdbFANp3vyBbtaljiSeEdnGIJdrUZD';
var time_vaild = 60 * 60 * 24 // 1 ngày
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// === CÁC HÀM THAO TÁC ĐẾN CSDL === //
// Đăng nhập
async function LOGIN(access_token) {
	var a = await axios.get(`https://graph.facebook.com/me?fields=id,name,ids_for_apps&access_token=${access_token}`);
	var b = a.data;
	if (b.error == undefined) {
		if (b.ids_for_apps.data[0]) {
			if (b.ids_for_apps.data[0].app.id == '1891657517831502') {
				var user_info = await db.getUser(b.id);
				if (user_info == null) {
					new dbUsers({ user_id: b.id, name: b.name, access: false, date_joined: new Date() }).save(function (err) { if (err) return console.log(err); });
				} else {
					dbUsers.findOneAndUpdate({ user_id: b.id }, { $set: { name: b.name } }, { new: true }, function (err, doc) { if (err) console.log("update document error"); });
					if (!user_info.access) return false;
				}
				return { uid: b.id, name: b.name, token: jwt.sign({ uid: b.id, exp: moment().unix() + time_vaild }, password) };
			} else { return false; }
		} else { return false; }
	} else { return false; }
}
// Kiểm tra phiên đăng nhập
async function CHECK_SESSION(uid, token) {
	try {
		var token_ = jwt.verify(token, password);
		if ((moment().unix() - token_.exp) <= time_vaild && token_.uid == uid) {
			var u = await dbUsers.findOne({ user_id: uid });
			if (u.access) {
				dbUsers.findOneAndUpdate({ user_id: uid }, { $set: { last_online: new Date() } }, { new: true }, function (err, doc) { if (err) console.log("update document error"); });
				return true;
			}
			else return false;
		} else return false;
	} catch (e) { return false; }
}
// Cập nhật thông tin bài đăng
async function UPDATE_POST(post_id, data) {
	var post_info = await db.getPost(post_id);
	if (post_info == null)
		new dbPosts(data).save(function (err) { if (err) return console.log(err); });
	else
		dbPosts.findOneAndUpdate({ post_id: post_id }, { $set: data }, { new: true }, function (err, doc) { if (err) console.log("update document error"); });
}
// Cập nhật thông tin trang
async function UPDATE_PAGE(page_id, data) {
	var page_info = await db.getPage(page_id);
	if (page_info == null)
		new dbPages(data).save(function (err) { if (err) return console.log(err); });
	else
		dbPages.findOneAndUpdate({ page_id: page_id }, { $set: data }, { new: true }, function (err, doc) { if (err) console.log("update document error"); });
}

async function GET_INFO_PAGE(page_id) {
	try {
		var response = await axios({
			method: 'get', timeout: 1000 * 30, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36 Edg/86.0.622.56' },
			url: `https://www.facebook.com/${page_id}`
		});
		// console.log(response);
		var a = response.data.match(/<title id="pageTitle">(.*)<\/title>/gi);
		a = a[0].replace('<title id="pageTitle">', '').replace('</title>', '').replace(' - Trang chủ | Facebook', '');
		// console.log(a);
		var b = response.data.match(/<span class="_52id _50f5 _50f7">([0-9\.]+)/gi);
		b = b[0].replace('<span class="_52id _50f5 _50f7">', '').replace('.', '').replace('.', '');
		// console.log(b);
		UPDATE_PAGE(page_id, { page_id: page_id, name: a, likes: b });
		return true;
	} catch (error) { console.log('GET_INFO_PAGE', error); return false; }
}
// GET_INFO_PAGE('834396353564049');
async function GET_PARSE_DATA(page_id, cursor = '') {
	try {
		var response = await axios({
			method: 'get', timeout: 1000 * 30, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36 Edg/86.0.622.56' },
			url: `https://www.facebook.com/pages_reaction_units/more/?page_id=${page_id}&cursor=${encodeURIComponent(`{"timeline_cursor":"${cursor}","timeline_section_cursor":{},"has_next_page":true}`)}&surface=www_pages_posts&unit_count=28&fb_dtsg_ag&__user=0&__a=1`
		});
		// console.log(response);
		var a = response.data.slice(9);
		a = JSON.parse(a);
		var b = a.domops[0][3].__html;
		var c = a.jsmods.pre_display_requires;
		// console.log(b);
		var d, e = {};
		for (var i in c) {
			if (c[i][0] == 'RelayPrefetchedStreamCache') {
				d = c[i][3][1].__bbox.result.data.feedback;
				var f = d.top_reactions.edges, g = '{';
				for (j in f)
					g += `"${f[j].node.reaction_type}": ${f[j].reaction_count},`;
				g = g.slice(0, -1) + '}';
				var post_id = d.url.split('/posts/');
				e = Object.assign(e, JSON.parse(`{ "${post_id[1]}": { "comment_count": "${d.comment_count.total_count}", "reaction_count": "${d.reaction_count.count}", "top_reactions": ${g}, "share_count": "${d.share_count.count}", "url": "${d.url}" } }`));
			}
		}
		var $ = cheerio.load(b), l = [], flag = false;
		$('._4-u2._4-u8').each(function (i, elem) {
			if (((i + 1) % 2) == 1 && $(this).find('._1ktf').length == 1) {
				var h = $(this).find('.userContent').text();
				var post_id = $(this).find('input[name="ft_ent_identifier"]').prop('value');
				l = l.concat({ post_id: post_id, page_id: page_id, time: $(this).find('abbr').prop('data-utime'), source: $(this).find('._1ktf').children('a').prop('data-ploi'), content: h, statistics: e[post_id] });
				if (!cursor) {
					UPDATE_POST(post_id, { post_id: post_id, page_id: page_id, time: $(this).find('abbr').prop('data-utime'), source: $(this).find('._1ktf').children('a').prop('data-ploi'), content: h, statistics: e[post_id] });
					flag = true;
				}
			}
		});
		if (flag) dbPages.findOneAndUpdate({ page_id: page_id }, { $set: { last_post_update: moment().unix() } }, { new: true }, function (err, doc) { if (err) console.log("update document error"); });
		cursor = b.match(/timeline_cursor%22%3A%22([a-zA-Z0-9-_]+)%22/gi);
		if (cursor) cursor = cursor[0].replace('timeline_cursor%22%3A%22', '').replace('%22', ''); else cursor = '';
		return { cursor: cursor, posts: l };
	} catch (error) { console.log(error); return false; }
}
// GET_PARSE_DATA('402546526524902');
async function GET_OLD_POSTS(url) {
	try {
		var response = await axios({
			method: 'get', timeout: 1000 * 30, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36 Edg/86.0.622.56' },
			url: url
		});
		var a = response.data;
		// console.log(a);
		var b = a.data, d = [];
		for (var i in b) {
			var c = b[i];
			if (c.type != 'status') {
				var reaction_count = c.reactions_like.summary.total_count + c.reactions_love.summary.total_count + c.reactions_wow.summary.total_count + c.reactions_haha.summary.total_count + c.reactions_sad.summary.total_count + c.reactions_angry.summary.total_count;
				var top_reactions = c.reactions_like.summary.total_count ? '"LIKE":' + c.reactions_like.summary.total_count + ',' : '';
				top_reactions += c.reactions_love.summary.total_count ? '"LOVE":' + c.reactions_love.summary.total_count + ',' : '';
				top_reactions += c.reactions_wow.summary.total_count ? '"WOW":' + c.reactions_wow.summary.total_count + ',' : '';
				top_reactions += c.reactions_haha.summary.total_count ? '"HAHA":' + c.reactions_haha.summary.total_count + ',' : '';
				top_reactions += c.reactions_sad.summary.total_count ? '"SAD":' + c.reactions_sad.summary.total_count + ',' : '';
				top_reactions += c.reactions_angry.summary.total_count ? '"ANGRY":' + c.reactions_angry.summary.total_count + ',' : '';
				top_reactions = Object.entries(JSON.parse(`{ ${top_reactions.slice(0, -1)} }`)).sort((a, b) => b[1] - a[1]);
				// console.log(top_reactions);
				var top_reactions_ = {};
				for (var j in top_reactions) { var c_ = top_reactions[j]; top_reactions_ = Object.assign(top_reactions_, JSON.parse(`{ "${c_[0]}": ${c_[1]} }`)); }
				d = d.concat({
					post_id: c.id, page_id: c.from.id, page_name: c.from.name, time: moment.tz(c.created_time, 'Asia/Ho_Chi_Minh').format('DD-MM-YYYY HH:mm:ss'), source: c.full_picture, content: c.message,
					statistics: [{ "comment_count": c.comments.summary.total_count, "reaction_count": reaction_count, "top_reactions": top_reactions_, "share_count": c.shares ? c.shares.count : 0, "url": '' }]
				});
				UPDATE_POST(c.id.split('_')[1], {
					post_id: c.id.split('_')[1], page_id: c.from.id, time: moment.tz(c.created_time, 'Asia/Ho_Chi_Minh').unix(), source: c.full_picture, content: c.message,
					statistics: { "comment_count": c.comments.summary.total_count, "reaction_count": reaction_count, "top_reactions": top_reactions_, "share_count": c.shares ? c.shares.count : 0, "url": '' }
				});
			}
		}
		return { cursor: (a.paging.next ? Buffer.from(a.paging.next).toString('base64') : ''), posts: d };
	} catch (error) { console.log(`GET_OLD_POSTS`, error); return false; }
}

// === CRONJOB === //
async function CRON_GET_POSTS() {
	var time_cron_vaild = 60 * 5;
	var a = await db.getPages();
	for (var i in a) {
		var b = a[i];
		var check = moment().unix() - (b.last_post_update ? b.last_post_update : 0);
		console.log('CONJOB GET POSTS', b.page_id, check);
		if (check >= time_cron_vaild) {
			var c = await GET_PARSE_DATA(b.page_id);
			if (!c) c = await GET_PARSE_DATA(b.page_id);
			if (c) console.log('CRONJOB GET POSTS success!', b.page_id);
			else console.log('CRONJOB GET POSTS fail!', b.page_id);
			await wait(1000 * 5);
		} else console.log('skip!');
		await wait(1000 * 10);
	}
	// await wait(1000 * 30);
	CRON_GET_POSTS();
} CRON_GET_POSTS();

// === KẾT NỐI SOCKET === //
io.on("connection", async function (socket) {
	socket.on('hello', (callback) => { console.log('hi!'); callback('Nice to meet you!'); });
	socket.on('login', async (access_token, callback) => {
		access_token = access_token.replace('#', '');
		var a = await LOGIN(access_token);
		callback(a);
	});
	socket.on('check-session', async (uid, token, callback) => {
		var a = await CHECK_SESSION(uid, token);
		callback(a);
	});
	socket.on('user-get-pages', async (uid, token, callback) => {
		var a = await CHECK_SESSION(uid, token);
		if (a) { var b = await db.getUser(uid); var c = await db.getPages(); callback({ user: b, pages: c }); }
		else callback(false);
	});
	socket.on('post-page', async (page_id, uid, token, callback) => {
		var a = await CHECK_SESSION(uid, token);
		if (a && page_id != '') {
			var b = await db.getUser(uid);
			if (b.admin) var c = await GET_INFO_PAGE(page_id); else c = { admin: false };
			console.log('POST PAGE', page_id, c);
			callback(c);
		}
		else callback(false);
	});
	socket.on('save-page', async (page_id, checked, uid, token, callback) => {
		var a = await CHECK_SESSION(uid, token);
		page_id = page_id.toString();
		if (a && page_id != '') {
			var b = await db.getUser(uid);
			var c = b.page_ids;
			if (checked) { if (!c.includes(page_id)) c = c.concat(page_id); }
			else { var d = c.indexOf(page_id); if (d > -1) c.splice(d, 1); }
			dbUsers.findOneAndUpdate({ user_id: uid }, { $set: { page_ids: c } }, { new: true }, function (err, doc) { if (err) console.log("update document error"); });
			callback(c);
		} else callback(false);
	});
	socket.on('user-get-posts', async (uid, token, callback) => {
		var a = await CHECK_SESSION(uid, token);
		if (a) { var b = await db.getUser(uid); var c = await db.getPages_(b.page_ids); var d = await db.getPostsFromPages(b.page_ids); callback({ pages: c, posts: d }); }
		else callback(false);
	});
	socket.on('user-get-old-posts', async (page_id, since, until, cursor, uid, token, callback) => {
		var a = await CHECK_SESSION(uid, token);
		if (a) {
			console.log('GET OLD POSTS', page_id, since, until, cursor);
			since = moment(`${since} 12: 00`, "DD/MM/YYYY H:mm").unix();
			until = moment(`${until} 12: 00`, "DD/MM/YYYY H:mm").unix();
			var url = cursor ? Buffer.from(cursor, 'base64').toString() : `https://graph.facebook.com/v3.0/${page_id}/posts?since=${since}&until=${until}&fields=id,name,created_time,message,from,type,full_picture,attachments{media{source}},status_type,reactions.type(LIKE).limit(0).summary(total_count).as(reactions_like),reactions.type(LOVE).limit(0).summary(total_count).as(reactions_love),reactions.type(WOW).limit(0).summary(total_count).as(reactions_wow),reactions.type(HAHA).limit(0).summary(total_count).as(reactions_haha),reactions.type(SAD).limit(0).summary(total_count).as(reactions_sad),reactions.type(ANGRY).limit(0).summary(total_count).as(reactions_angry),comments.limit(0).summary(total_count),shares&access_token=${access_token}`;
			var b = await GET_OLD_POSTS(url); callback(b);
		}
		else callback(false);
	});

});

server.listen(3000, () => { console.log('listening on *:3000'); });