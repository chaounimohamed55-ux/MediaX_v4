const { getDB } = require('./db');
const { postToGroup } = require('./groups');
// Publish a work episode to selected group, avoid duplicates by checking episodes table
function publishEpisode(workTitle, ep, groupId, author, botName, cb){
  const db = getDB();
  db.get('SELECT id FROM works WHERE title=?',[workTitle], (err,row)=>{
    if(err) return cb(err);
    if(!row){
      db.run('INSERT INTO works(title,source,lang,published) VALUES (?,?,?,?)',[author,'translated','arabic',0], function(e){
        if(e) return cb(e);
        const workId = this.lastID;
        insertEpisode(workId);
      });
    } else {
      insertEpisode(row.id);
    }
    function insertEpisode(workId){
      db.get('SELECT id FROM episodes WHERE workId=? AND ep=?',[workId,ep], (er,r)=>{
        if(er) return cb(er);
        if(r) return cb(null,{skipped:true,reason:'duplicate'});
        const msg = `📺 الانمي: ${workTitle}\n🔹 الحلقة: ${ep}\n🖊️ الناشر: ${author}\n\n👨‍💻 المطور: https://www.facebook.com/profile.php?id=61555323903116\n🤖 البوت: ${botName}`;
        postToGroup(groupId,msg,(postErr, res)=>{
          if(postErr) return cb(postErr);
          const postId = res && res.id ? res.id : null;
          db.run('INSERT INTO episodes(workId,ep,groupId,postId,createdAt) VALUES (?,?,?,?,strftime(\'%s\',\'now\'))',[workId,ep,groupId,postId], function(e2){
            if(e2) return cb(e2);
            cb(null,{ok:true,postId});
          });
        });
      });
    }
  });
}
module.exports = { publishEpisode };
