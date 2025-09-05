const request = require('request');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
function callSendAPI(psid, message){
  const body = { recipient: { id: psid }, message };
  request({
    uri: 'https://graph.facebook.com/v20.0/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: body
  }, (err) => { if(err) console.error('send error', err); });
}
function sendText(psid, text, quickReplies){
  const msg = { text };
  if(Array.isArray(quickReplies)) msg.quick_replies = quickReplies;
  callSendAPI(psid, msg);
}
module.exports = { sendText, callSendAPI };
