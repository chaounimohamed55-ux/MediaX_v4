const { getDB } = require('./db');
const USAGE_CODE = process.env.USAGE_CODE || '61555323903116';
function ensureUser(psid, cb){
  const db = getDB();
  db.get('SELECT * FROM users WHERE psid=?',[psid], (err,row)=>{
    if(err) return cb(err);
    if(row) return cb(null,row);
    db.run('INSERT INTO users(psid,activated,attempts,banned) VALUES (?,?,?,?)',[psid,0,0,0], function(e){
      if(e) return cb(e);
      db.get('SELECT * FROM users WHERE psid=?',[psid], (er,r)=>cb(er,r));
    });
  });
}
function checkCode(psid, code, cb){
  const db = getDB();
  db.get('SELECT * FROM users WHERE psid=?',[psid], (err,row)=>{
    if(err) return cb(err);
    if(!row) return cb(new Error('no user'));
    if(row.banned){ return cb(null,{ok:false,reason:'banned'}); }
    if(code === USAGE_CODE){
      db.run('UPDATE users SET activated=1, attempts=0 WHERE psid=?',[psid], ()=>cb(null,{ok:true}));
    } else {
      const attempts = (row.attempts||0)+1;
      const banned = attempts>=10?1:0;
      db.run('UPDATE users SET attempts=?, banned=? WHERE psid=?',[attempts,banned,psid], ()=>{
        const msg = banned? 'banned' : 'wrong';
        cb(null,{ok:false,reason:msg,attempts});
      });
    }
  });
}
module.exports = { ensureUser, checkCode };
