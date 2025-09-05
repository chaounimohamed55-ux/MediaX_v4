const sqlite3 = require('sqlite3').verbose();
let db;
function initDB(){
  db = new sqlite3.Database('./bot.db', err=>{
    if(err) console.error('DB ERR', err);
    else {
      console.log('DB connected');
      db.run(`CREATE TABLE IF NOT EXISTS users (
        psid TEXT PRIMARY KEY, activated INTEGER DEFAULT 0, attempts INTEGER DEFAULT 0, banned INTEGER DEFAULT 0, createdAt INTEGER DEFAULT (strftime('%s','now'))
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY, name TEXT, main_group TEXT, type TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS works (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, image TEXT, desc TEXT, source TEXT, lang TEXT, published INTEGER DEFAULT 0, createdAt INTEGER DEFAULT (strftime('%s','now'))
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, workId INTEGER, ep TEXT, groupId TEXT, postId TEXT, createdAt INTEGER DEFAULT (strftime('%s','now'))
      )`);
    }
  });
}
function getDB(){ return db; }
module.exports = { initDB, getDB };
