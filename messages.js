const { sendText } = require('./sender');
const { ensureUser, checkCode } = require('./auth');
const { addGroup, listGroups } = require('./groups');
const { publishEpisode } = require('./publisher');
const { getDB } = require('./db');

const SESS = new Map();
const BOT_NAME = process.env.BOT_NAME || 'AnimeBot';
const PUBLISHER_NAME = process.env.PUBLISHER_NAME || 'ميديا اكس';

function welcomeIfNew(psid){
  ensureUser(psid,(err,user)=>{
    if(err) return;
    if(user.activated) {
      sendText(psid, `مرحبًا 👋 أنت مُفعّل مسبقًا. البوت: ${BOT_NAME} — المطور: https://www.facebook.com/profile.php?id=61555323903116`);
      sendQuick(psid);
    } else {
      sendText(psid, `أهلًا! هذا بوت ${BOT_NAME} — مطور: https://www.facebook.com/profile.php?id=61555323903116\nأدخل كود تفعيل لاستخدام البوت:`);
      SESS.set(psid,{step:'await_code'});
    }
  });
}
function sendQuick(psid){
  const quicks = [
    { content_type: 'text', title: 'إضافة مجموعة', payload: 'ADD_GROUP' },
    { content_type: 'text', title: 'نشر', payload: 'PUBLISH' },
    { content_type: 'text', title: 'أرشيف', payload: 'ARCHIVE' }
  ];
  sendText(psid,'قائمة الأوامر:', quicks);
}
function handleText(psid, text){
  const db = getDB();
  db.get('SELECT banned,activated,attempts FROM users WHERE psid=?',[psid], (err,row)=>{
    if(err) return;
    if(!row) { welcomeIfNew(psid); return; }
    if(row.banned){ return; }
    const s = SESS.get(psid) || null;
    if(s && s.step === 'await_code'){
      checkCode(psid, text.trim(), (err,res)=>{
        if(err) return;
        if(res.ok){ sendText(psid,'تم التفعيل ✅'); sendQuick(psid); SESS.delete(psid); }
        else {
          if(res.reason === 'wrong'){
            sendText(psid, `الكود غير صحيح — محاولة ${res.attempts}/10`);
          } else if(res.reason === 'banned'){
            sendText(psid,'تم حظرك بعد محاولات متكررة.'); SESS.delete(psid);
          }
        }
      });
      return;
    }
    if(text.trim().toLowerCase() === 'إضافة مجموعة' || text.trim().toLowerCase()==='اضافة مجموعة'){
      SESS.set(psid,{step:'add_main'});
      sendText(psid,'أرسل رابط/معرف المجموعة الرئيسية (حيث سيُنشر الأرشيف التجميعي):');
      return;
    }
    if(s && s.step === 'add_main'){
      s.main = text.trim();
      s.step = 'add_secondary';
      sendText(psid,'أرسل رابط/معرف المجموعة الثانوية (حيث تُنشر الحلقات مفصلة):');
      return;
    }
    if(s && s.step === 'add_secondary'){
      s.secondary = text.trim();
      s.step = 'add_third';
      sendText(psid,'أرسل رابط/معرف المجموعة الثالثة (قائمة الأعمال الأسبوعية غير المكتملة):');
      return;
    }
    if(s && s.step === 'add_third'){
      s.third = text.trim();
      s.step = 'choose_type';
      sendText(psid,'اختر نوع المجموعة: (مثال: انمي, مانغا, مانهاوا, فيلم, كرتون, كوميكس, رواية)');
      return;
    }
    if(s && s.step === 'choose_type'){
      s.type = text.trim();
      addGroup(s.secondary, 'secondary-'+s.type, s.main, (err)=>{
        addGroup(s.main, 'main-archive', null, ()=>{});
        addGroup(s.third || ('third-'+s.type), 'weekly', null, ()=>{});
        sendText(psid,'تم حفظ المجموعات ✅');
        SESS.delete(psid);
      });
      return;
    }
    if(text.trim().toLowerCase() === 'نشر' || text.trim().toLowerCase()==='publish'){
      SESS.set(psid,{step:'pub_title'});
      sendText(psid,'أدخل اسم العمل (العنوان):');
      return;
    }
    if(s && s.step === 'pub_title'){
      s.title = text.trim();
      s.step = 'pub_ep';
      sendText(psid,'أدخل رقم الحلقة/الفصل أو وصفها:');
      return;
    }
    if(s && s.step === 'pub_ep'){
      s.ep = text.trim();
      listGroups((err,rows)=>{
        if(err || !rows.length){ sendText(psid,'لا توجد مجموعات مسجلة.'); SESS.delete(psid); return; }
        let msg = 'اختر رقم المجموعة للنشر:\n'+ rows.map((r,i)=> `${i+1}) ${r.name} — ${r.id}`).join('\n');
        s.groups = rows;
        s.step = 'pub_choose_group';
        sendText(psid,msg);
      });
      return;
    }
    if(s && s.step === 'pub_choose_group'){
      const idx = parseInt(text.trim(),10);
      const rows = s.groups || [];
      const row = rows[idx-1];
      if(!row){ sendText(psid,'اختيار غير صحيح. أعد المحاولة.'); return; }
      publishEpisode(s.title, s.ep, row.id, PUBLISHER_NAME, BOT_NAME, (err,res)=>{
        if(err) return sendText(psid,'فشل النشر. تأكد من صلاحيات التوكن.');
        if(res && res.skipped) return sendText(psid,'تم تجاهل النشر — مكرر.');
        sendText(psid,'تم النشر ✅ هل تريد رابط تجميعي لكل الحلقات؟ (نعم/لا)');
        s.step = 'pub_done';
      });
      return;
    }
    if(s && s.step === 'pub_done'){
      const yes = ['نعم','yes','y','ايه','ايوه'].includes(text.trim().toLowerCase());
      SESS.delete(psid);
      if(yes){
        const base = process.env.PUBLIC_BASE_URL || '';
        if(!base) return sendText(psid,'ضع PUBLIC_BASE_URL في الإعدادات لعرض الرابط.');
        sendText(psid, `رابط الأرشيف: ${base.replace(/\/$/,'')}/archive`);
      } else sendText(psid,'تم. شكرًا.');
      return;
    }
    sendText(psid,'اكتب "مساعدة" أو "مساعدة" للاطلاع على الأوامر.');
  });
}
module.exports = { welcomeIfNew, handleText };
