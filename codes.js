const crypto = require('crypto');
const { getDB } = require('./db');
function gen(len=12){ return crypto.randomBytes(len).toString('hex').slice(0,len).toUpperCase(); }
function generateWeeklyCodes(count=20,uses=150,days=7){
  const db = getDB();
  const expires = Math.floor(Date.now()/1000) + days*24*60*60;
  const stmt = db.prepare('INSERT INTO codes(code,maxUses,uses,expiresAt) VALUES (?,?,0,?)');
  for(let i=0;i<count;i++) stmt.run(gen(12),uses,expires);
  stmt.finalize();
}
module.exports = { generateWeeklyCodes };
