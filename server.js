const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const { initDB, getDB } = require('./services/db');
const { welcomeIfNew, handleText } = require('./services/messages');
initDB();
const app = express();
app.use(bodyParser.json());
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'verify';

app.get('/webhook', (req,res)=>{
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if(mode && token){
    if(mode==='subscribe' && token===VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.sendStatus(403);
  }
  res.sendStatus(400);
});

app.post('/webhook', (req,res)=>{
  const body = req.body;
  if(body.object === 'page'){
    (body.entry || []).forEach(entry=>{
      const event = entry.messaging && entry.messaging[0];
      if(!event) return;
      const psid = event.sender && event.sender.id;
      const msg = (event.message && (event.message.text || '')) || '';
      if(!psid) return;
      if(msg && msg.trim().length>0){
        welcomeIfNew(psid);
        handleText(psid, msg);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else res.sendStatus(404);
});

app.get('/archive', (req,res)=>{
  const db = getDB();
  db.all('SELECT w.title,e.ep,e.groupId,e.postId,e.createdAt FROM episodes e LEFT JOIN works w ON e.workId = w.id ORDER BY e.createdAt DESC',[],(err,rows)=>{
    if(err) return res.status(500).send('DB error');
    const items = rows.map(r=>{
      const dt = new Date(r.createdAt*1000).toISOString().slice(0,19).replace('T',' ');
      const link = r.postId ? `https://facebook.com/${r.postId}` : '#';
      return `<li><b>${r.title}</b> — حلقة ${r.ep} — مجموعة ${r.groupId} — <a href="${link}">رابط المنشور</a> — <small>${dt}</small></li>`;
    }).join('\n');
    res.send(`<!doctype html><meta charset="utf-8"><title>الأرشيف</title><ul>${items}</ul><hr><p>🤖 البوت: ${process.env.BOT_NAME||'Bot'}</p>`);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Bot v4 running on port', PORT));
