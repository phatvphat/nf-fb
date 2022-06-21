const mongoose = require('mongoose');

var database = {}
// tạo kết nối;
database.main_conn = mongoose.createConnection('mongodb://pvl:Pvl2019@45.119.85.54:27017/nf_fb', { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true });
module.exports = database;