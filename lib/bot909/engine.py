"""909 challenge bot. Private admin ownership is checked before every admin action."""
import html, re
from datetime import date
from .core import OWNER, local_now, day_number, accepts, parse_answers, grade, media

BACK=('⬅️ Orqaga','home')
def button(label,data):return {'text':label,'callback_data':data}
def keys(*rows):return {'inline_keyboard':[[button(*b) for b in row] for row in rows]}
def safe(text):return html.escape(str(text))
HOME=keys([('📝 Test javoblarini yuborish','test')],[('🎙 Retelling yuborish','retell')],[('📊 Mening natijalarim','mine')],[('🎓 Guruhim','groups')])
ADMIN=keys([('➕ Guruh qo‘shish','a:addgroup'),('🎓 Guruhlar','a:groups')],[('📚 Test va retelling','a:materials')],[('📊 Bugungi natijalar','a:results'),('👥 O‘quvchilar','a:students')],[('📢 Majburiy kanal','a:channel'),('🗓 Boshlanish sanasi','a:date')],[('▶️ Challenge yoqish','a:activate'),('⏸ To‘xtatish','a:pause')],[('📬 Tarqatish holati','a:outbox')],[BACK])

class Bot:
    def __init__(self,db,tg):self.db=db;self.tg=tg
    def settings(self):return self.db.one('cb909_settings',id='eq.true') or {}
    def user(self,uid):
        return self.db.one('cb909_users',telegram_id='eq.'+str(uid)) or {'telegram_id':uid,'step':'name','state':{}}
    def save(self,u,**values):
        u.update(values);self.db.upsert('cb909_users',u,'telegram_id');return u
    def step(self,u,step,state=None):return self.save(u,step=step,state=state or {})
    def display(self,u,text,markup=None):
        p=dict(chat_id=u['telegram_id'],text=text,parse_mode='HTML',reply_markup=markup or keys([BACK]))
        if getattr(self,'edit_menu',False) and u.get('menu_id'):
            try:
                self.tg.call('editMessageText',message_id=u['menu_id'],**p);return
            except RuntimeError:pass
        sent=self.tg.call('sendMessage',**p)
        self.save(u,menu_id=sent['message_id'])
    def subscribed(self,uid):
        c=self.settings()
        if not c.get('channel_id') or not c.get('channel_url'):return False
        try:
            member=self.tg.call('getChatMember',chat_id=c['channel_id'],user_id=uid)
            return member.get('status') in ('member','administrator','creator') or member.get('status')=='restricted' and member.get('is_member') is True
        except RuntimeError:return False
    def gate(self,u, selecting=False):
        if not u.get('name'):
            self.step(u,'name');self.display(u,'👤 <b>Ism va familiyangizni yozing.</b>\n\nMasalan: Rustam Usmonov',keys());return False
        if not self.subscribed(u['telegram_id']):
            c=self.settings(); rows=[]
            if c.get('channel_url'):rows.append([{'text':'📢 Kanalga obuna bo‘lish','url':c['channel_url']}])
            rows.append([button('✅ Obunani tekshirish','check')]);rows.append([button('✏️ Ismni tuzatish','rename')])
            self.display(u,'📢 <b>Majburiy obuna</b>\n\nKanalga obuna bo‘lib, tekshirish tugmasini bosing.' if c.get('channel_id') else '⏳ <b>Kanal sozlanmoqda.</b>\nAdmin kanalni ulashi bilan davom etasiz.',{'inline_keyboard':rows});return False
        groups=self.db.get('cb909_groups',active='eq.true',order='label.asc')
        if not selecting and not any(g['chat_id']==u.get('group_id') for g in groups):
            self.choose_group(u,groups);return False
        return True
    def choose_group(self,u,groups=None):
        self.step(u,'group');groups=groups if groups is not None else self.db.get('cb909_groups',active='eq.true')
        self.display(u,'🎓 <b>Guruhingizni tanlang.</b>\n\nGuruh tanlash majburiy.' if groups else '⏳ <b>909 guruh hali ulanmagan.</b>',keys(*[[( '🎓 '+g.get('title',g['label']),'g:'+str(g['chat_id']))] for g in groups],[BACK]))
    def material(self,u):
        c=self.settings();now=local_now()
        if not c.get('start_date') or not c.get('active') or not accepts(date.fromisoformat(c['start_date']),now):raise ValueError('⏰ Vazifalar faqat challenge kuni 21:00 gacha qabul qilinadi.')
        return self.db.one('cb909_materials',group_id='eq.'+str(u['group_id']),day='eq.'+str(day_number(date.fromisoformat(c['start_date']),now)),published='eq.true')
    def home(self,u):
        self.step(u,'home');self.display(u,'🏛 <b>ARK EDUCATION · 909 CHALLENGE</b>\n\n👤 '+safe(u['name'])+'\n⏰ Topshirish: <b>21:00 gacha</b>\n\nKerakli bo‘limni tanlang.',HOME)
    def notify(self,uid,key,text,extra=None):
        self.db.call('POST','cb909_outbox',{'on_conflict':'dedupe'},dict(dedupe=key,chat_id=uid,method='sendMessage',payload=dict(text=text,parse_mode='HTML',**(extra or {}))),'resolution=ignore-duplicates,return=representation')
    def handle(self,update):
        member=update.get('my_chat_member');m=update.get('message') or {};cb=update.get('callback_query') or {}
        self.edit_menu=bool(cb)
        actor=(member or cb or m).get('from') or {};uid=actor.get('id')
        if not uid:return
        if member:
            if uid!=OWNER:return
            chat=member['chat'];status=member['new_chat_member']['status']
            if chat['type'] not in ('group','supergroup') or status not in ('administrator','member'):return
            existing=self.db.one('cb909_groups',chat_id='eq.'+str(chat['id']))
            if not existing:self.db.upsert('cb909_groups',dict(chat_id=chat['id'],title=chat.get('title','Guruh'),label='909',active=False),'chat_id')
            self.notify(OWNER,'group:'+str(chat['id']), '➕ <b>Guruh aniqlandi:</b> '+safe(chat.get('title','Guruh'))+'\n/admin → Guruhlar orqali tasdiqlang.');return
        if cb:
            chat=(cb.get('message') or {}).get('chat') or {}
            if chat.get('type')!='private' or chat.get('id')!=uid:return
            self.tg.call('answerCallbackQuery',callback_query_id=cb['id'])
        else:
            chat=m.get('chat') or {}
            if chat.get('type')!='private':return
        u=self.user(uid);text=m.get('text','');action=cb.get('data','')
        if text.startswith('/admin') or action.startswith('a:'):
            if uid!=OWNER:
                self.display(u,'🔒 Bu bo‘lim faqat administrator uchun.');return
            self.admin(u,action or 'a:home');return
        if uid==OWNER and u.get('step','').startswith('admin:') and not text.startswith('/start') and action!='home':
            self.admin_input(u,m);return
        if text.startswith('/start'):
            welcome='👋 <b>7 kunlik challenge botiga xush kelibsiz!</b>\n\n🏛 <b>ARK EDUCATION</b>\n\nHar kuni grammatika testini ishlang va retelling yuboring. Natijalaringiz botda saqlanadi.\n\n📄 Test — <b>08:00</b>\n🎙 Retelling mavzusi — <b>16:00</b>\n⏰ Vazifalar — <b>21:00 gacha</b>\n🕒 O‘zbekiston vaqti'
            if u.get('name'):
                self.step(u,'home');self.display(u,welcome+'\n\n👤 '+safe(u['name'])+'\nDavom etish uchun tugmani bosing.',keys([('🚀 Davom etish','home')],[('✏️ Ismni tuzatish','rename')]));return
            self.step(u,'name');self.display(u,welcome+'\n\n👤 <b>Ism va familiyangizni yozing.</b>\nMasalan: <i>Rustam Usmonov</i>',keys());return
        if action=='rename':
            self.step(u,'name');self.display(u,'👤 <b>Ism va familiyangizni yozing.</b>\n\nMasalan: Rustam Usmonov',keys());return
        if u['step']=='name' and text:
            name=' '.join(text.split())
            if len(name.split())<2 or len(name)>80:
                self.display(u,'👤 Ism va familiyangizni birga yozing.\nMasalan: Rustam Usmonov',keys());return
            self.save(u,name=name,step='home')
            if self.gate(u):self.home(u)
            return
        if not self.gate(u, selecting=action.startswith('g:')):return
        if action.startswith('g:'):
            group=self.db.one('cb909_groups',chat_id='eq.'+action[2:],active='eq.true')
            if not group:raise ValueError('Guruh topilmadi.')
            membership=self.tg.call('getChatMember',chat_id=group['chat_id'],user_id=uid)
            if membership['status'] not in ('member','administrator','creator'):
                raise ValueError('Avval o‘z guruhingizga a’zo bo‘ling.')
            self.save(u,group_id=group['chat_id']);self.home(u);return
        if action in ('home','check'):self.home(u);return
        if action=='groups':self.choose_group(u);return
        if action=='test':
            self.material(u);self.step(u,'code');self.display(u,'🔑 <b>Test kodini kiriting.</b>\n\nMasalan: <code>1111</code>');return
        if action=='retell':
            mat=self.material(u)
            if not mat or not (mat.get('retell_text') or mat.get('retell_photo_id')):raise ValueError('Retelling topshirig‘i hali yuklanmagan.')
            self.step(u,'retell',{'material':mat['id']});self.display(u,'🎙 <b>Retelling yuboring.</b>\n\nOvozli xabar, audio yoki video qabul qilinadi.\n⏰ <b>21:00 gacha</b>');return
        if action=='mine':
            rows=self.db.get('cb909_submissions',student_id='eq.'+str(uid),order='submitted_at.desc',limit=30)
            lines=[('📝 '+str(r['score'])+'/'+str(r['total']) if r['kind']=='test' else '🎙 Retelling qabul qilingan')+' · '+safe(r['submitted_at'][:10]) for r in rows]
            self.display(u,'📊 <b>Mening natijalarim</b>\n\n'+'\n'.join(lines or ['Hali natija yo‘q.']));return
        if u['step']=='code' and text:
            mat=self.material(u)
            if not mat or text.strip()!=mat['code']:raise ValueError('Test kodi noto‘g‘ri yoki bu test sizning guruhingizga tegishli emas.')
            self.step(u,'answers',{'material':mat['id']});self.display(u,'📝 <b>Javoblarni yuboring.</b>\n\nNamuna: <code>1a2b3c</code>\n<code>1A 2B 3C</code> shakli ham qabul qilinadi.');return
        if u['step']=='answers' and text:
            mat=self.material(u)
            if not mat or mat['id']!=u['state'].get('material'):raise ValueError('Test muddati tugagan.')
            answers=parse_answers(text,len(mat['answer_key']));self.step(u,'confirm',{'material':mat['id'],'answers':answers})
            self.display(u,'📝 <b>Javoblaringizni tekshiring:</b>\n\n<code>'+ ' '.join(str(i+1)+a for i,a in enumerate(answers))+'</code>',keys([('✅ Tasdiqlash','confirm'),('✏️ Tuzatish','edit')],[BACK]));return
        if action=='edit' and u['step']=='confirm':
            self.step(u,'answers',{'material':u['state']['material']});self.display(u,'✏️ Javoblarni qayta yuboring.\nNamuna: <code>1a2b3c</code>');return
        if action=='confirm' and u['step']=='confirm':
            mat=self.material(u)
            if not mat or mat['id']!=u['state']['material']:raise ValueError('Test muddati tugagan.')
            r=self.db.rpc('cb909_submit',{'p_student':uid,'p_material':mat['id'],'p_kind':'test','p_payload':{'answers':u['state']['answers']}})
            result=grade(r['payload']['answers'],mat['answer_key']);self.step(u,'home')
            msg=f'✅ <b>Natijangiz saqlandi!</b>\n\n📝 {result["score"]}/{result["total"]} · {result["percent"]}%\n❌ Xato savollar: '+(', '.join(map(str,result['wrong'])) or 'yo‘q')
            self.display(u,msg,HOME);self.notify(OWNER,'result:'+r['id'],'📊 <b>Test natijasi</b>\n👤 '+safe(u['name'])+'\n🔑 '+safe(mat['code'])+f'\n📝 {result["score"]}/{result["total"]} · {result["percent"]}%');return
        if u['step']=='retell':
            f=media(m)
            if not f:raise ValueError('🎙 Ovozli xabar, audio yoki video yuboring.')
            mat=self.material(u)
            if not mat or mat['id']!=u['state'].get('material'):raise ValueError('Retelling muddati tugagan.')
            r=self.db.rpc('cb909_submit',{'p_student':uid,'p_material':mat['id'],'p_kind':'retell','p_payload':f});self.step(u,'home');self.display(u,'✅ <b>Retelling qabul qilindi!</b>\n\nBugungi vazifangiz saqlandi.',HOME)
            self.notify(OWNER,'retell:'+r['id'],'🎙 <b>Retelling yuborildi</b>\n👤 '+safe(u['name'])+'\n/admin → Bugungi natijalar orqali ko‘ring.')
            self.db.call('POST','cb909_outbox',{'on_conflict':'dedupe'},dict(dedupe='media:'+r['id'],chat_id=OWNER,method={'voice':'sendVoice','audio':'sendAudio','video':'sendVideo','video_note':'sendVideoNote','document':'sendDocument'}[r['payload']['kind']],payload={r['payload']['kind']:r['payload']['file_id']}),'resolution=ignore-duplicates,return=representation');return
        self.home(u)
    def admin(self,u,action):
        if u['telegram_id']!=OWNER:raise ValueError('Admin ruxsati yo‘q.')
        if action not in ('a:retell','a:publish') and not action.startswith('a:page:'):self.step(u,'admin:home')
        if action in ('a:home','a:back'):
            c=self.settings();self.display(u,'🛠 <b>909 CHALLENGE · ADMIN</b>\n\n📅 '+safe(c.get('start_date') or 'Sana belgilanmagan')+'\n📢 '+safe(c.get('channel_id') or 'Kanal ulanmagan')+'\nHolat: '+('🟢 Faol' if c.get('active') else '⏸ To‘xtatilgan'),ADMIN);return
        if action=='a:addgroup':
            bot=self.tg.call('getMe');url='https://t.me/'+bot['username']+'?startgroup=cb909'
            self.display(u,'➕ <b>Guruh qo‘shish</b>\n\nBotni 909 guruhga qo‘shing va admin qiling. So‘ng “Guruhlar”dan tasdiqlang.',{'inline_keyboard':[[{'text':'➕ Guruhga qo‘shish','url':url}],[button('🎓 Guruhlar','a:groups')],[button('⬅️ Admin','a:home')]]});return
        if action=='a:groups':
            gs=self.db.get('cb909_groups',order='title.asc')
            self.display(u,'🎓 <b>Guruhlar</b>\n\nGuruhni bosib faollashtiring yoki to‘xtating.',keys(*[[(( '🟢 ' if g['active'] else '⚪ ')+g['title']+' → '+g['label'],'a:group:'+str(g['chat_id']))] for g in gs],[('⬅️ Admin','a:home')]));return
        if action.startswith('a:group:'):
            g=self.db.one('cb909_groups',chat_id='eq.'+action.split(':')[2])
            if not g:raise ValueError('Guruh topilmadi.')
            me=self.tg.call('getMe');rights=self.tg.call('getChatMember',chat_id=g['chat_id'],user_id=me['id'])
            if not g['active'] and rights['status']!='administrator':raise ValueError('Avval botni guruh administratori qiling.')
            self.db.patch('cb909_groups',{'active':not g['active']},chat_id='eq.'+str(g['chat_id']));self.admin(u,'a:groups');return
        if action=='a:channel':
            self.step(u,'admin:channel');self.display(u,'📢 <b>Majburiy kanalni yuboring.</b>\n\nNamuna: <code>@kanal_nomi</code>\nYopiq kanal: <code>-1001234567890 https://t.me/+taklif</code>\nBot kanalda admin bo‘lishi kerak.',keys([('⬅️ Admin','a:home')]));return
        if action=='a:date':
            self.step(u,'admin:date');self.display(u,'🗓 <b>7 kunlik challenge boshlanish sanasi</b>\n\nNamuna: <code>2026-10-12</code>\nVaqt: O‘zbekiston (UTC+5).',keys([('⬅️ Admin','a:home')]));return
        if action=='a:materials':
            self.display(u,'📚 <b>Vazifa yuklash yoki ko‘rish</b>',keys(*[[('📅 '+str(n)+'-kun','a:day:'+str(n))] for n in range(1,8)],[('⬅️ Admin','a:home')]));return
        if action.startswith('a:day:'):
            d=int(action.split(':')[2]);gs=self.db.get('cb909_groups',active='eq.true')
            if not gs:raise ValueError('Avval 909 guruhni ulang.')
            self.display(u,f'📅 <b>{d}-kun uchun guruh</b>',keys(*[[('🎓 '+g['title'],'a:mat:'+str(g['chat_id'])+':'+str(d))] for g in gs],[('⬅️ Admin','a:home')]));return
        if action.startswith('a:mat:'):
            _,_,gid,d=action.split(':');state={'group_id':int(gid),'day':int(d)}
            mat=self.db.one('cb909_materials',group_id='eq.'+gid,day='eq.'+d)
            if mat:
                state['material']=mat['id'];self.step(u,'admin:existing',state)
                self.display(u,f'📚 <b>{d}-kun</b>\n🔑 {safe(mat["code"])}\nSavollar: {len(mat["answer_key"])}\nRetelling: '+('✅' if mat.get('retell_text') or mat.get('retell_photo_id') else '❌')+'\nHolat: '+('Nashr qilingan' if mat['published'] else 'Qoralama'),keys([('🎙 Retelling yuklash','a:retell')],[('✅ Nashr qilish','a:publish')],[('⬅️ Admin','a:home')]));return
            self.step(u,'admin:code',state);self.display(u,'🔑 <b>Oddiy test kodini yozing.</b>\nNamuna: <code>1111</code>',keys([('⬅️ Admin','a:home')]));return
        if action in ('a:retell','a:publish'):
            mid=u.get('state',{}).get('material')
            if not mid:raise ValueError('Avval vazifani tanlang.')
            if action=='a:retell':
                self.step(u,'admin:retell',{'material':mid});self.display(u,'🎙 Retelling matni yoki rasmini yuboring.',keys([('⬅️ Admin','a:home')]));return
            self.db.patch('cb909_materials',{'published':True},id='eq.'+mid)
            self.display(u,'✅ Vazifa nashr qilindi. Belgilangan vaqtda guruhga yuboriladi.',keys([('⬅️ Admin','a:home')]));return
        if action=='a:pause':self.db.patch('cb909_settings',{'active':False},id='eq.true');self.admin(u,'a:home');return
        if action=='a:activate':
            c=self.settings();gs=self.db.get('cb909_groups',active='eq.true')
            if not c.get('channel_id') or not c.get('start_date') or not gs:raise ValueError('Kanal, sana va faol guruhni avval sozlang.')
            if not self.subscribed(OWNER):raise ValueError('Kanalga obunani tekshirish ishlamayapti; bot huquqlarini tekshiring.')
            self.db.patch('cb909_settings',{'active':True},id='eq.true');self.admin(u,'a:home');return
        if action=='a:students':
            rows=self.db.get('cb909_users',name='not.is.null',order='name.asc',limit=500)
            self.pages(u,'👥 <b>O‘quvchilar</b>',[safe(r['name'])+' · '+('🎓' if r.get('group_id') else 'guruh tanlanmagan') for r in rows]);return
        if action=='a:results':
            from .scheduler import reports
            self.pages(u,'📊 <b>Bugungi natijalar</b>',reports(self.db,self.settings(),local_now()));return
        if action=='a:outbox':
            rows=self.db.get('cb909_outbox',order='created_at.desc',limit=30)
            self.pages(u,'📬 <b>Tarqatish holati</b>',[safe(r['dedupe'])+' · '+safe(r['status']) for r in rows]);return
        if action.startswith('a:page:'):
            pages=u.get('state',{}).get('pages',[]);n=int(action.split(':')[2])
            if not 0<=n<len(pages):raise ValueError('Sahifa topilmadi.')
            self.show_page(u,pages,n);return
    def pages(self,u,title,lines):
        pages=[];chunk=title+'\n\n'
        for line in lines or ['Hali ma’lumot yo‘q.']:
            if len(chunk)+len(line)>3800:pages.append(chunk);chunk=title+'\n\n'
            chunk+=line+'\n'
        pages.append(chunk);self.step(u,'admin:pages',{'pages':pages});self.show_page(u,pages,0)
    def show_page(self,u,pages,n):
        nav=[]
        if n:nav.append(('⬅️ Oldingi','a:page:'+str(n-1)))
        if n+1<len(pages):nav.append(('Keyingi ➡️','a:page:'+str(n+1)))
        self.display(u,pages[n],keys(nav,[('⬅️ Admin','a:home')]) if nav else keys([('⬅️ Admin','a:home')]))
    def admin_input(self,u,m):
        if u['telegram_id']!=OWNER:raise ValueError('Admin ruxsati yo‘q.')
        text=m.get('text','').strip();s=u['state'];step=u['step']
        if step=='admin:channel':
            fields=text.split();cid=fields[0] if fields else '';url='https://t.me/'+cid[1:] if re.fullmatch(r'@[A-Za-z0-9_]{5,32}',cid) else (fields[1] if len(fields)==2 else '')
            if not url.startswith('https://t.me/') or not (cid.startswith('@') or re.fullmatch(r'-100\d+',cid)):raise ValueError('Kanal formatini to‘g‘ri yozing.')
            me=self.tg.call('getMe');rights=self.tg.call('getChatMember',chat_id=cid,user_id=me['id'])
            if rights['status']!='administrator':raise ValueError('Botni kanalda admin qiling.')
            self.db.patch('cb909_settings',{'channel_id':cid,'channel_url':url},id='eq.true');self.admin(u,'a:home');return
        if step=='admin:date':
            d=date.fromisoformat(text)
            if d<local_now().date():raise ValueError('Boshlanish sanasi o‘tmishda bo‘lmasin.')
            self.db.patch('cb909_settings',{'start_date':text,'active':False},id='eq.true');self.admin(u,'a:home');return
        if step=='admin:code':
            if not re.fullmatch(r'\d{4,8}',text):raise ValueError('Kod 4–8 ta raqamdan iborat bo‘lsin. Masalan: 1111')
            if self.db.one('cb909_materials',code='eq.'+text):raise ValueError('Bu kod band; boshqa kod yozing.')
            self.step(u,'admin:pdf',{**s,'code':text});self.display(u,'📄 <b>Test PDF faylini yuboring.</b>',keys([('⬅️ Admin','a:home')]));return
        if step=='admin:pdf':
            doc=m.get('document') or {}
            if doc.get('mime_type')!='application/pdf':raise ValueError('PDF fayl yuboring.')
            self.step(u,'admin:key',{**s,'pdf_id':doc['file_id']});self.display(u,'🔐 <b>Javob kalitini yuboring.</b>\n\nMasalan: <code>1a2b3c</code> yoki <code>ABC</code>\nKalit o‘quvchilarga ko‘rsatilmaydi.',keys([('⬅️ Admin','a:home')]));return
        if step=='admin:key':
            count=len(re.findall(r'[A-Da-d]',text));answers=parse_answers(text,count)
            if not 1<=count<=100:raise ValueError('1–100 ta javob kerak.')
            mat=self.db.call('POST','cb909_materials',value={**{k:s[k] for k in ('group_id','day','code','pdf_id')},'answer_key':answers})[0]
            self.step(u,'admin:existing',{'material':mat['id']});self.display(u,'✅ <b>Test qoralamasi saqlandi.</b>\n\nEndi retelling matni yoki rasmini qo‘shing.',keys([('🎙 Retelling yuklash','a:retell')],[('✅ Nashr qilish','a:publish')],[('⬅️ Admin','a:home')]));return
        if step=='admin:retell':
            photo=(m.get('photo') or [])
            if not text and not photo:raise ValueError('Retelling matni yoki matnli rasm yuboring.')
            values={'retell_text':text or m.get('caption',''),'retell_photo_id':photo[-1]['file_id'] if photo else None}
            if len(values['retell_text'])>3500:raise ValueError('Matn 3500 belgidan oshmasin yoki rasm sifatida yuboring.')
            self.db.patch('cb909_materials',values,id='eq.'+s['material']);self.step(u,'admin:existing',s);self.display(u,'✅ Retelling saqlandi.',keys([('✅ Nashr qilish','a:publish')],[('⬅️ Admin','a:home')]));return
        self.admin(u,'a:home')
