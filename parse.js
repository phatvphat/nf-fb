const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

!async function GET_PARSE_DATA(page_id) {
	try {
		var response = await axios({
			method: 'get', timeout: 1000 * 30, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36 Edg/86.0.622.56' },
			url: `https://www.facebook.com/pages_reaction_units/more/?page_id=${page_id}&cursor=%7B%22timeline_cursor%22%3A%22%22%2C%22timeline_section_cursor%22%3A%7B%7D%2C%22has_next_page%22%3Atrue%7D&surface=www_pages_posts&unit_count=28&fb_dtsg_ag&__user=0&__a=1`
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
				var id_post = d.url.split('/posts/');
				e = Object.assign(e, JSON.parse(`{ "${id_post[1]}": { "comment_count": "${d.comment_count.total_count}", "reaction_count": "${d.reaction_count.count}", "top_reactions": ${g}, "share_count": "${d.share_count.count}", "url": "${d.url}" } }`));
			}
		}
		var $ = cheerio.load(b), l = [];
		$('._4-u2._4-u8').each(function (i, elem) {
			if (((i + 1) % 2) == 1 && $(this).find('._1ktf').length == 1) {
				var h = $(this).find('.userContent').text();
				// console.log(i, h);
				var id_post = $(this).find('input[name="ft_ent_identifier"]').prop('value');
				// console.log(id_post, $(this).find('abbr').prop('data-utime'));
				// console.log($(this).find('._1ktf').children('a').prop('data-ploi'));
				// console.log($(this).find('._1ktf').length, $(this).find('._2a2q._65sr').length);
				l = l.concat({ id_post: id_post, time: $(this).find('abbr').prop('data-utime'), source: $(this).find('._1ktf').children('a').prop('data-ploi'), caption: h, statistics: e[id_post] });
			}
		});
		// fs.writeFileSync('data.json', JSON.stringify(l));
		// fs.writeFileSync('reaction.json', JSON.stringify(e));
		fs.writeFileSync(page_id + '.json', JSON.stringify(l));
	} catch (error) { console.log(error); }
}('402546526524902');
