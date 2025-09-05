const request = require('request');
const { getDB } = require('./db');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
function addGroup(id,name,main,cb){
  const db = getDB();
  db.run('INSERT OR REPLACE INTO groups(id,name,main_group) VALUES (?,?,?)',[id,name,main], err=>cb(err));
}
function listGroups(cb){
  const db = getDB();
  db.all('SELECT id,name,main_group FROM groups',[],(err,rows)=>cb(err,rows||[]));
}
// post to group feed
function postToGroup(groupId, message, cb){
  request({
    uri: `https://graph.facebook.com/v20.0/${groupId}/feed`,
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    form: { message }
  }, (err,res,body)=>{
    if(err) return cb(err);
    try{ const d = JSON.parse(body); cb(null,d); } catch(e){ cb(e); }
  });
}
module.exports = { addGroup, listGroups, postToGroup };
