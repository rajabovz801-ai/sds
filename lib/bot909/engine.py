"""909 challenge bot. Private admin ownership is checked before every admin action."""
import html, re
from datetime import date
from .core import OWNER, local_now, day_number, accepts, parse_answers, grade, media, group_label, challenge_start, CHALLENGE_GROUP, valid_name

BACK=('⬅️ Orqaga','home')
def button(label,data):return {'text':label,'callback_data':data}
def keys(*rows):return {'inline_keyboard':[[button(*b) for b in row] for row in rows]}
def safe(text):return html.escape(str(text))
HOME=keys([('📝 Test javoblarini yuborish','test')],[('🎙 Retelling yuborish','retell')],[('📊 Mening natijalarim','mine')],[('👤 Profilim','profile')])
ADMIN=keys([('➕ Guruh qo‘shish','a:addgroup'),('🎓 Guruhlar','a:groups')],[('📚 Test va retelling','a:materials')],[('📊 Bugungi natijalar','a:results'),('👥 O‘quvchilar','a:students')],[('📢 Majburiy kanal','a:channel'),('🗓 Boshlanish sanasi','a:date')],[('▶️ Challenge yoqish','a:activate'),('⏸ To‘xtatish','a:pause')],[('📬 Tarqatish holati','a:outbox')],[('🔄 Yuborilmagan xabarlar','a:failed')],[('📄 HTML hisobot','a:html')],[BACK])

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
            except RuntimeError as error:
                if 'message is not modified' in str(error).lower():return
        sent=self.tg.call('sendMessage',**p)
        self.save(u,menu_id=sent['message_id'])
    def subscribed(self,uid):
        c=self.settings()
        if not c.get('channel_id') or not c.get('channel_url'):return False
        try:
            member=self.tg.call('getChatMember',chat_id=c['channel_id'],user_id=uid)
            return member.get('status') in ('member','administrator','creator') or member.get('status')=='restricted' and member.get('is_member') is True
        except RuntimeError:raise ValueError('🔄 Obunani hozir tekshirib bo‘lmadi. Birozdan keyin “Tekshirish”ni qayta bosing.')
    def gate(self,u, selecting=False):
        if not u.get('name'):
            self.step(u,'name');self.display(u,'👤 <b>Ism va familiyangizni yozing.</b>\n\nMasalan: Rustam Usmonov',keys());return False
        try:subscribed=self.subscribed(u['telegram_id']);unavailable=False
        except ValueError:subscribed=False;unavailable=True
        if not subscribed:
            c=self.settings(); rows=[]
            if c.get('channel_url'):rows.append([{'text':'📢 Kanalga obuna bo‘lish','url':c['channel_url']}])
            rows.append([button('✅ Obunani tekshirish','check')])
            self.display(u,'🔄 Obunani hozir tekshirib bo‘lmadi. Birozdan keyin “Tekshirish”ni qayta bosing.' if unavailable else '📢 <b>Majburiy obuna</b>\n\nKanalga obuna bo‘lib, tekshirish tugmasini bosing.' if c.get('channel_id') else '⏳ <b>Kanal sozlanmoqda.</b>\nAdmin kanalni ulashi bilan davom etasiz.',{'inline_keyboard':rows});return False
        group=self.db.one('cb909_groups',chat_id='eq.'+str(CHALLENGE_GROUP),is_test='eq.false')
        if not group:
            self.display(u,'⏳ 909 challenge hozircha to‘xtatilgan. Natijalaringiz saqlangan.',keys([('👤 Profilim','profile'),('📊 Natijalarim','mine')]))
            return False
        if u.get('group_id')!=group['chat_id']:self.save(u,group_id=group['chat_id'])
        return True
    def choose_group(self,u,groups=None):
        if self.gate(u):self.home(u)
    def material(self,u):
        c=self.settings();now=local_now();g=self.db.one('cb909_groups',chat_id='eq.'+str(u.get('group_id'))) or {}
        start=challenge_start(g,c)
        if u.get('group_id')!=CHALLENGE_GROUP:raise ValueError('Hozir faqat 909 challenge ishlaydi.')
        if not start or not c.get('active') or not g.get('active') or g.get('is_test'):raise ValueError('⏳ 909 challenge hozircha to‘xtatilgan.')
        day=day_number(date.fromisoformat(start),now)
        if day<1:raise ValueError('📅 Challenge '+start+' kuni boshlanadi. Test 08:00 da yuboriladi.')
        if day>7:raise ValueError('🏁 7 kunlik challenge yakunlandi. Natijalaringizni menyudan ko‘ring.')
        if now.hour<8:raise ValueError('⏳ Bugungi test 08:00 dan qabul qilinadi.')
        if now.hour>=21:raise ValueError('🔒 Bugungi qabul 21:00 da yopildi. Natijalaringiz saqlangan.')
        return self.db.one('cb909_materials',group_id='eq.'+str(u['group_id']),cycle_start='eq.'+start,day='eq.'+str(day_number(date.fromisoformat(start),now)),published='eq.true')
    def coins(self,u,material_id=None):
        query={'student_id':'eq.'+str(u['telegram_id'])}
        if material_id:query['material_id']='eq.'+material_id
        return sum(r['amount'] for r in getattr(self.db,'get_all',self.db.get)('cb909_coins',**query))
    def home(self,u):
        g=self.db.one('cb909_groups',chat_id='eq.'+str(CHALLENGE_GROUP)) or {};now=local_now();start=g.get('start_date');status='⏳ Challenge tayyorlanmoqda.'
        if start:
            day=day_number(date.fromisoformat(start),now)
            if day<1:status='📅 Boshlanish: <b>'+safe(start)+'</b> · Test 08:00'
            elif day>7:status='🏁 7 kunlik challenge yakunlandi.'
            else:
                mat=self.db.one('cb909_materials',group_id='eq.'+str(g['chat_id']),cycle_start='eq.'+start,day='eq.'+str(day))
                rows=self.db.get('cb909_submissions',student_id='eq.'+str(u['telegram_id']),material_id='eq.'+mat['id']) if mat else []
                done={r['kind'] for r in rows}
                status=f'📚 {day}-kun / 7\n📝 Test '+('✅' if 'test' in done else '⏳')+' · 🎙 Retelling '+('✅' if 'retell' in done else '⏳')+'\n'+('🔒 Qabul yopilgan.' if now.hour>=21 else '⏳ Test 08:00 dan.' if now.hour<8 else '⏰ Topshirish: <b>21:00 gacha</b>')
        if not g.get('active') or not self.settings().get('active'):status='⏸ Challenge vaqtincha to‘xtatilgan.'
        draft=u.get('state',{}) if u.get('step')=='confirm' else u.get('state',{}).get('draft',{})
        self.step(u,'home',{'draft':draft} if draft else {})
        markup=HOME
        if draft:markup={'inline_keyboard':[[button('📝 Saqlangan javoblarga qaytish','resume')]]+HOME['inline_keyboard']}
        self.display(u,'🏛 <b>ARK EDUCATION · 909</b>\n\n👤 '+safe(u['name'])+'\n'+status+'\n\nKerakli bo‘limni tanlang.',markup)
    def profile(self,u):
        self.step(u,'profile');self.display(u,'👤 <b>Profilim</b>\n\nIsm-familiya: '+safe(u.get('name') or 'Kiritilmagan')+'\nChallenge: <b>909</b>',keys([('✏️ Ism-familiyani tuzatish','rename')],[BACK]))
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
            if not existing:self.db.upsert('cb909_groups',dict(chat_id=chat['id'],title=chat.get('title','Guruh'),label=group_label(chat.get('title','Guruh')),is_test=chat.get('title','').strip().lower() in ('test','test guruhi'),active=False),'chat_id')
            self.notify(OWNER,'group:'+str(chat['id']), '➕ <b>Bot guruhga qo‘shildi:</b> '+safe(chat.get('title','Guruh'))+'\n/admin → Guruhlar orqali holatini tekshiring.');return
        if cb:
            chat=(cb.get('message') or {}).get('chat') or {}
            if chat.get('type')!='private' or chat.get('id')!=uid:return
            self.tg.call('answerCallbackQuery',callback_query_id=cb['id'])
        else:
            chat=m.get('chat') or {}
            if chat.get('type')!='private':return
        u=self.user(uid);text=m.get('text','');action=cb.get('data','')
        if cb and u.get('menu_id') and cb.get('message',{}).get('message_id') not in (None,u['menu_id']):
            self.edit_menu=False
            self.display(u,'ℹ️ Bu eski menyu. Davom etish uchun eng oxirgi xabardagi tugmalardan foydalaning.',keys([('🏠 Asosiy menyu','home')]))
            return
        if text.startswith('/admin') or action.startswith('a:'):
            if uid!=OWNER:
                self.display(u,'🔒 Bu bo‘lim faqat administrator uchun.');return
            self.admin(u,action or 'a:home');return
        if uid==OWNER and u.get('step','').startswith('admin:') and not text.startswith('/start') and action!='home':
            self.admin_input(u,m);return
        if text.startswith('/start'):
            welcome='🏛 <b>ARK EDUCATION</b>\n\n<b>7 kunlik challenge’ga xush kelibsiz! 👋</b>\n\nHar kuni grammatika testi va retelling topshirig‘ini bajaring. Natijalaringizni shu botda kuzating.\n\nTest — <b>08:00</b>\nRetelling — <b>16:00</b>\nTopshirish — <b>21:00 gacha</b>'
            self.step(u,'welcome')
            self.display(u,welcome,keys([('🚀 Davom etish' if u.get('name') else '🚀 Boshlash','begin')]))
            return
        if action=='begin':
            if u.get('name'):
                if self.gate(u):self.home(u)
            else:
                self.step(u,'name');self.display(u,'👤 <b>Ism va familiyangizni yozing.</b>\n\nMasalan: <i>Rustam Usmonov</i>',keys())
            return
        if action=='profile':self.profile(u);return
        if action=='rename':
            self.step(u,'name');self.display(u,'👤 <b>Ism va familiyangizni yozing.</b>\n\nMasalan: Rustam Usmonov',keys());return
        if u['step']=='name' and text:
            name=' '.join(text.split())
            if not valid_name(name):
                self.display(u,'👤 Ism va familiyangizni birga yozing.\nMasalan: Rustam Usmonov',keys());return
            self.save(u,name=name,step='home')
            if self.gate(u):self.home(u)
            return
        if not self.gate(u, selecting=action.startswith('g:')):return
        if action.startswith('g:') or action=='groups':self.home(u);return
        if action in ('home','check'):self.home(u);return
        if action=='resume':
            draft=u.get('state',{}).get('draft')
            if not draft:raise ValueError('Saqlangan javoblar topilmadi.')
            mat=self.material(u)
            if not mat or mat['id']!=draft.get('material'):raise ValueError('Saqlangan javoblarning muddati tugagan.')
            self.step(u,'confirm',draft);self.confirmation(u);return
        if action=='test':
            mat=self.material(u)
            if not mat:raise ValueError('📄 Bugungi test hali yuklanmagan.')
            self.step(u,'code');self.display(u,'🔑 <b>Test kodini kiriting.</b>\n\nMasalan: <code>1111</code>');return
        if action=='retell':
            mat=self.material(u)
            if local_now().hour<16:raise ValueError('🎙 Retelling 16:00 dan qabul qilinadi.')
            if mat and self.db.one('cb909_submissions',student_id='eq.'+str(uid),material_id='eq.'+mat['id'],kind='eq.retell'):raise ValueError('✅ Bugungi retelling allaqachon qabul qilingan.')
            if not mat or not (mat.get('retell_text') or mat.get('retell_photo_id')):raise ValueError('Retelling topshirig‘i hali yuklanmagan.')
            self.step(u,'retell',{'material':mat['id']});self.display(u,'🎙 <b>Retelling yuboring.</b>\n\nOvozli xabar, audio yoki video qabul qilinadi.\n⏰ <b>21:00 gacha</b>');return
        if action=='mine':
            rows=self.db.get('cb909_submissions',student_id='eq.'+str(uid),order='submitted_at.desc',limit=30)
            lines=[('📝 '+str(r['score'])+'/'+str(r['total']) if r['kind']=='test' else '🎙 Retelling qabul qilingan')+' · '+safe(r['submitted_at'][:10]) for r in rows]
            self.display(u,'📊 <b>Mening natijalarim</b>\n🪙 Umumiy coin: <b>'+str(self.coins(u))+'</b>\n\n'+'\n'.join(lines or ['Hali natija yo‘q.']));return
        if u['step']=='code' and text:
            mat=self.material(u)
            if not mat or text.strip()!=mat['code']:raise ValueError('Test kodi noto‘g‘ri yoki bu test sizning guruhingizga tegishli emas.')
            if self.db.one('cb909_submissions',student_id='eq.'+str(uid),material_id='eq.'+mat['id'],kind='eq.test'):raise ValueError('✅ Bu test natijangiz allaqachon saqlangan. “Mening natijalarim”dan ko‘ring.')
            self.step(u,'answers',{'material':mat['id']});self.display(u,'📝 <b>'+str(len(mat['answer_key']))+' ta javobni yuboring.</b>\n\nNamuna: <code>1a2b3c</code>\n<code>1A 2B 3C</code> shakli ham qabul qilinadi.');return
        if u['step']=='answers' and text:
            mat=self.material(u)
            if not mat or mat['id']!=u['state'].get('material'):raise ValueError('Test muddati tugagan.')
            answers=parse_answers(text,len(mat['answer_key']));self.step(u,'confirm',{'material':mat['id'],'answers':answers})
            self.confirmation(u);return
        if action=='edit' and u['step']=='confirm':
            self.step(u,'answers',{'material':u['state']['material']});self.display(u,'✏️ Javoblarni qayta yuboring.\nNamuna: <code>1a2b3c</code>');return
        if action=='confirm' and u['step']=='confirm':
            mat=self.material(u)
            if not mat or mat['id']!=u['state']['material']:raise ValueError('Test muddati tugagan.')
            r=self.db.rpc('cb909_submit',{'p_student':uid,'p_material':mat['id'],'p_kind':'test','p_payload':{'answers':u['state']['answers']}})
            return
        if u['step']=='confirm':
            self.confirmation(u,'ℹ️ Javoblaringiz saqlangan. Quyidagi tasdiqlash yoki tuzatish tugmasini bosing.');return
        if u['step']=='retell':
            f=media(m)
            if not f:raise ValueError('🎙 Ovozli xabar, audio yoki video yuboring.')
            mat=self.material(u)
            if not mat or mat['id']!=u['state'].get('material'):raise ValueError('Retelling muddati tugagan.')
            self.db.rpc('cb909_submit',{'p_student':uid,'p_material':mat['id'],'p_kind':'retell','p_payload':f});return
        if u['step'] in ('code','answers'):raise ValueError('📝 Javob yoki kodni matn sifatida yuboring. Namuna: 1a2b3c')
        self.home(u)
    def confirmation(self,u,prefix='📝 <b>Javoblaringizni tekshiring:</b>'):
        answers=u.get('state',{}).get('answers',[])
        self.display(u,prefix+'\n\n<code>'+' '.join(str(i+1)+a for i,a in enumerate(answers))+'</code>',keys([('✅ Tasdiqlash','confirm'),('✏️ Tuzatish','edit')],[BACK]))
    def admin(self,u,action):
        if u['telegram_id']!=OWNER:raise ValueError('Admin ruxsati yo‘q.')
        if action not in ('a:retell','a:audio','a:publish','a:preview','a:editmat','a:replacepdf','a:title','a:replacekey','a:replacecode') and not action.startswith('a:page:'):self.step(u,'admin:home')
        if action in ('a:home','a:back'):
            c=self.settings();self.display(u,'🛠 <b>CHALLENGE · ADMIN</b>\n\n📅 '+'Guruh sanalari → Guruhlar'+'\n📢 '+safe(c.get('channel_id') or 'Kanal ulanmagan')+'\nHolat: '+('🟢 Faol' if c.get('active') else '⏸ To‘xtatilgan'),ADMIN);return
        if action=='a:addgroup':
            bot=self.tg.call('getMe');url='https://t.me/'+bot['username']+'?startgroup=cb909'
            self.display(u,'➕ <b>Guruh qo‘shish</b>\n\nBotni 909 guruhga qo‘shing va admin qiling. So‘ng “Guruhlar”dan tasdiqlang.',{'inline_keyboard':[[{'text':'➕ Guruhga qo‘shish','url':url}],[button('🎓 Guruhlar','a:groups')],[button('⬅️ Admin','a:home')]]});return
        if action=='a:groups':
            gs=self.db.get('cb909_groups',chat_id='eq.'+str(CHALLENGE_GROUP),order='title.asc')
            self.display(u,'🎓 <b>Guruhlar</b>\n\nGuruhni tanlab, holati va sozlamalarini ko‘ring.',keys(*[[(( '🟢 ' if g['active'] else '⚪ ')+g['title'],'a:group:'+str(g['chat_id']))] for g in gs],[('⬅️ Admin','a:home')]));return
        if action.startswith(('a:group:','a:toggle:')):
            g=self.db.one('cb909_groups',chat_id='eq.'+action.split(':')[2])
            if not g or g['chat_id']!=CHALLENGE_GROUP:raise ValueError('Hozir faqat 909 challenge boshqariladi.')
            if action.startswith('a:toggle:'):
                me=self.tg.call('getMe');rights=self.tg.call('getChatMember',chat_id=g['chat_id'],user_id=me['id'])
                if not g['active'] and rights['status']!='administrator':raise ValueError('Avval botni guruh administratori qiling.')
                self.db.patch('cb909_groups',{'active':not g['active']},chat_id='eq.'+str(g['chat_id']))
                g['active']=not g['active']
            self.display(u,'🎓 <b>'+safe(g['title'])+'</b>\n\n📅 '+safe(g.get('start_date') or 'Sana belgilanmagan')+'\nHolat: '+('🟢 Faol' if g['active'] else '⏸ To‘xtatilgan'),keys([('🗓 Sana belgilash','a:groupdate:'+str(g['chat_id']))],[('⏸ To‘xtatish' if g['active'] else '▶️ Faollashtirish','a:toggle:'+str(g['chat_id']))],[('⬅️ Guruhlar','a:groups')]))
            return
        if action=='a:channel':
            self.step(u,'admin:channel');self.display(u,'📢 <b>Majburiy kanalni yuboring.</b>\n\nNamuna: <code>@kanal_nomi</code>\nYopiq kanal: <code>-1001234567890 https://t.me/+taklif</code>\nBot kanalda admin bo‘lishi kerak.',keys([('⬅️ Admin','a:home')]));return
        if action=='a:date':
            gs=self.db.get('cb909_groups',chat_id='eq.'+str(CHALLENGE_GROUP),active='eq.true',is_test='eq.false')
            self.display(u,'🗓 <b>Qaysi guruhning boshlanish sanasi?</b>',keys(*[[('🎓 '+g['title'],'a:groupdate:'+str(g['chat_id']))] for g in gs],[('⬅️ Admin','a:home')]))
            return
        if action.startswith('a:groupdate:'):
            gid=int(action.split(':')[2]);g=self.db.one('cb909_groups',chat_id='eq.'+str(gid))
            if not g or g['chat_id']!=CHALLENGE_GROUP:raise ValueError('Hozir faqat 909 challenge boshqariladi.')
            self.step(u,'admin:date',{'group_id':gid})
            self.display(u,'🗓 <b>'+safe(g['title'])+' · boshlanish sanasi</b>\n\nNamuna: <code>2026-10-12</code>\nFaol challenge paytida sanani o‘zgartirmang.',keys([('⬅️ Admin','a:home')]))
            return
        if action=='a:materials':
            self.display(u,'📚 <b>Vazifa yuklash yoki ko‘rish</b>',keys(*[[('📅 '+str(n)+'-kun','a:day:'+str(n))] for n in range(1,8)],[('⬅️ Admin','a:home')]));return
        if action.startswith('a:day:'):
            d=int(action.split(':')[2]);gs=self.db.get('cb909_groups',chat_id='eq.'+str(CHALLENGE_GROUP))
            if not gs:raise ValueError('Avval 909 guruhni ulang.')
            self.display(u,f'📅 <b>{d}-kun uchun guruh</b>',keys(*[[('🎓 '+g['title'],'a:mat:'+str(g['chat_id'])+':'+str(d))] for g in gs],[('⬅️ Admin','a:home')]));return
        if action.startswith('a:mat:'):
            _,_,gid,d=action.split(':')
            if int(gid)!=CHALLENGE_GROUP:raise ValueError('Hozir faqat 909 challenge boshqariladi.')
            group=self.db.one('cb909_groups',chat_id='eq.'+gid) or {}
            if not group.get('start_date'):raise ValueError('Avval guruhning boshlanish sanasini belgilang.')
            state={'group_id':int(gid),'day':int(d),'cycle_start':group['start_date']}
            mat=self.db.one('cb909_materials',group_id='eq.'+gid,cycle_start='eq.'+group['start_date'],day='eq.'+d)
            if mat:
                state['material']=mat['id'];self.step(u,'admin:existing',state)
                self.display(u,f'📚 <b>{d}-kun</b>\n🔑 {safe(mat["code"])}\nSavollar: {len(mat["answer_key"])}\nRetelling: '+('✅' if mat.get('retell_text') or mat.get('retell_photo_id') else '❌')+'\nHolat: '+('Nashr qilingan' if mat['published'] else 'Qoralama'),keys([('👁 Oldindan ko‘rish','a:preview')],[('🎙 Retelling yuklash','a:retell')],[('🎧 Namuna audio','a:audio')],[('✅ Nashr qilish','a:publish')],[('✏️ PDF / mavzu / kalit','a:editmat')],[('⬅️ Admin','a:home')]));return
            self.step(u,'admin:code',state);self.display(u,'🔑 <b>Oddiy test kodini yozing.</b>\nNamuna: <code>1111</code>',keys([('⬅️ Admin','a:home')]));return
        if action in ('a:retell','a:audio','a:publish','a:preview','a:editmat','a:replacepdf','a:title','a:replacekey','a:replacecode'):
            if action in ('a:editmat','a:replacepdf','a:title','a:replacekey','a:replacecode'):
                mid=u.get('state',{}).get('material')
                if not mid:raise ValueError('Avval materialni tanlang.')
                if action=='a:editmat':
                    self.display(u,'✏️ <b>Qaysi qismni almashtirasiz?</b>\nNatija topshirilgan testning PDF, kodi va kaliti o‘zgartirilmaydi.',keys([('📄 PDF','a:replacepdf'),('📚 Mavzu','a:title')],[('🔐 Javob kaliti','a:replacekey'),('🔑 Kod','a:replacecode')],[('⬅️ Admin','a:home')]));return
                self.step(u,'admin:'+action[2:],{'material':mid});self.display(u,{'a:replacepdf':'Yangi PDF yuboring.','a:title':'Mavzu nomini yozing (120 belgigacha).','a:replacekey':'Yangi javob kalitini yuboring. Masalan: 1a2b3c','a:replacecode':'Yangi kodni yozing. Masalan: 1111'}[action],keys([('⬅️ Admin','a:home')]));return
            mid=u.get('state',{}).get('material')
            if not mid:raise ValueError('Avval vazifani tanlang.')
            if action=='a:preview':
                self.preview(u,mid);return
            if action=='a:retell':
                self.step(u,'admin:retell',{'material':mid});self.display(u,'🎙 Retelling matni yoki rasmini yuboring.',keys([('⬅️ Admin','a:home')]));return
            if action=='a:audio':
                self.step(u,'admin:audio',{'material':mid});self.display(u,'🎧 <b>Retelling uchun namuna audioni yuboring.</b>\n\nMP3/audio yoki ovozli xabar qabul qilinadi.',keys([('⬅️ Admin','a:home')]));return
            self.db.patch('cb909_materials',{'published':True},id='eq.'+mid)
            self.display(u,'✅ Vazifa nashr qilindi. Belgilangan vaqtda guruhga yuboriladi.',keys([('⬅️ Admin','a:home')]));return
        if action=='a:pause':self.db.patch('cb909_settings',{'active':False},id='eq.true');self.admin(u,'a:home');return
        if action=='a:activate':
            c=self.settings();gs=self.db.get('cb909_groups',chat_id='eq.'+str(CHALLENGE_GROUP),active='eq.true',is_test='eq.false')
            if not c.get('channel_id') or not gs or any(not g.get('start_date') for g in gs):raise ValueError('Kanal, sana va faol guruhni avval sozlang.')
            if not self.subscribed(OWNER):raise ValueError('Kanalga obunani tekshirish ishlamayapti; bot huquqlarini tekshiring.')
            for group in gs:
                me=self.tg.call('getMe')
                member=self.tg.call('getChatMember',chat_id=group['chat_id'],user_id=me['id'])
                if member['status']!='administrator':raise ValueError(safe(group['title'])+': botni administrator qiling.')
                mats=self.db.get('cb909_materials',group_id='eq.'+str(group['chat_id']),cycle_start='eq.'+group['start_date'],published='eq.true')
                if set(m['day'] for m in mats)!=set(range(1,8)):raise ValueError(safe(group['title'])+': 7 kunlik testlarni avval yuklab, nashr qiling.')
            self.db.patch('cb909_settings',{'active':True},id='eq.true');self.admin(u,'a:home');return
        if action=='a:students':
            rows=self.db.get('cb909_users',name='not.is.null',group_id='eq.'+str(CHALLENGE_GROUP),order='name.asc',limit=500)
            self.pages(u,'👥 <b>O‘quvchilar</b>',[safe(r['name'])+' · ID '+str(r['telegram_id']) for r in rows]);return
        if action=='a:results':
            from .scheduler import reports
            self.pages(u,'📊 <b>Bugungi natijalar</b>',reports(self.db,self.settings(),local_now()));return
        if action=='a:html':
            from .reports import group_report,render_html
            from .scheduler import enqueue
            from uuid import uuid4
            gs=self.db.get('cb909_groups',chat_id='eq.'+str(CHALLENGE_GROUP),active='eq.true',is_test='eq.false')
            data=[group_report(self.db,g,local_now()) for g in gs if g.get('start_date')]
            enqueue(self.db,'manual-html:'+str(uuid4()),OWNER,'sendDocument',{'_html':render_html(data),'_filename':'ARK_Challenge_preview.html','caption':'📊 Admin HTML hisobot · joriy holat'})
            self.display(u,'📊 HTML hisobot yuborish navbatiga qo‘shildi.',keys([('⬅️ Admin','a:home')]))
            return
        if action=='a:outbox':
            rows=self.db.get('cb909_outbox',order='created_at.desc',limit=20)
            labels={'pending':'⏳ Navbatda','sending':'📤 Yuborilmoqda','sent':'✅ Yuborilgan','failed':'❌ Yuborilmagan','uncertain':'❓ Chatni tekshirish kerak'}
            self.pages(u,'📬 <b>Tarqatish holati</b>',[safe(r['dedupe'])+'\n'+labels.get(r['status'],r['status'])+' · Urinish: '+str(r.get('attempts',0))+'\n'+safe(r.get('error_summary') or '') for r in rows])
            return
        if action=='a:failed':
            rows=self.db.get('cb909_outbox',status='eq.failed',**{'or':'(error_code.neq.410,error_code.is.null)'},order='created_at.desc',limit=15)
            self.display(u,'📬 <b>Aniq yuborilmagan xabarlar</b>\n\nSababni tuzatgach, xabarni tanlab qayta yuboring. Yuborilgani noma’lum xabarlar avtomatik takrorlanmaydi.',keys(*[[(safe(r['dedupe'])[:45],'a:retry:'+r['id'])] for r in rows],[('⬅️ Admin','a:home')]))
            return
        if action.startswith('a:retry:'):
            item=self.db.one('cb909_outbox',id='eq.'+action.split(':')[2])
            if item and item.get('error_code')==410:raise ValueError('Bu xabar to‘xtatilgan yoki muddati tugagan. Qayta yuborilmaydi.')
            if not item or item['status']!='failed':raise ValueError('Faqat aniq yuborilmagan xabar qayta yuboriladi.')
            self.db.patch('cb909_outbox',{'status':'pending','next_attempt_at':local_now().isoformat()},id='eq.'+item['id'],status='eq.failed')
            self.display(u,'✅ Qayta yuborish navbatiga qo‘shildi.',keys([('⬅️ Admin','a:home')]))
            return
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
        if step in ('admin:replacepdf','admin:title','admin:replacekey','admin:replacecode'):
            if step=='admin:replacepdf':
                doc=m.get('document') or {}
                if doc.get('mime_type')!='application/pdf':raise ValueError('PDF fayl yuboring.')
                values={'pdf_id':doc['file_id']}
            elif step=='admin:title':
                if not text or len(text)>120:raise ValueError('Mavzu 1–120 belgidan iborat bo‘lsin.')
                values={'title':text}
            elif step=='admin:replacecode':
                if not re.fullmatch(r'\d{4,8}',text):raise ValueError('Kod 4–8 ta raqam bo‘lsin.')
                values={'code':text}
            else:
                count=len(re.findall(r'[A-Da-d]',text))
                if not 1<=count<=100:raise ValueError('1–100 ta javob kerak.')
                values={'answer_key':parse_answers(text,count),'accepted_alternatives':{}}
            self.db.rpc('cb909_edit_material',{'p_material':s['material'],'p_values':values})
            self.step(u,'admin:existing',s);self.display(u,'✅ O‘zgarish saqlandi.',keys([('👁 Oldindan ko‘rish','a:preview')],[('✏️ Yana tahrirlash','a:editmat')],[('⬅️ Admin','a:home')]));return
        if step=='admin:channel':
            fields=text.split();cid=fields[0] if fields else '';url='https://t.me/'+cid[1:] if re.fullmatch(r'@[A-Za-z0-9_]{5,32}',cid) else (fields[1] if len(fields)==2 else '')
            if not url.startswith('https://t.me/') or not (cid.startswith('@') or re.fullmatch(r'-100\d+',cid)):raise ValueError('Kanal formatini to‘g‘ri yozing.')
            me=self.tg.call('getMe');rights=self.tg.call('getChatMember',chat_id=cid,user_id=me['id'])
            if rights['status']!='administrator':raise ValueError('Botni kanalda admin qiling.')
            self.db.patch('cb909_settings',{'channel_id':cid,'channel_url':url},id='eq.true');self.admin(u,'a:home');return
        if step=='admin:date':
            try:d=date.fromisoformat(text)
            except ValueError:raise ValueError('Sanani YYYY-MM-DD shaklida yozing. Masalan: 2026-10-12.')
            if d<local_now().date():raise ValueError('Boshlanish sanasi o‘tmishda bo‘lmasin.')
            if self.settings().get('active'):raise ValueError('Avval challenge’ni to‘xtating; yangi sana keyingi bosqich uchun ishlatiladi.')
            self.db.patch('cb909_groups',{'start_date':text},chat_id='eq.'+str(s['group_id']));self.admin(u,'a:home');return
        if step=='admin:code':
            if not re.fullmatch(r'\d{4,8}',text):raise ValueError('Kod 4–8 ta raqamdan iborat bo‘lsin. Masalan: 1111')
            if self.db.one('cb909_materials',group_id='eq.'+str(s['group_id']),cycle_start='eq.'+s['cycle_start'],code='eq.'+text):raise ValueError('Bu kod band; boshqa kod yozing.')
            self.step(u,'admin:pdf',{**s,'code':text});self.display(u,'📄 <b>Test PDF faylini yuboring.</b>',keys([('⬅️ Admin','a:home')]));return
        if step=='admin:pdf':
            doc=m.get('document') or {}
            if doc.get('mime_type')!='application/pdf':raise ValueError('PDF fayl yuboring.')
            self.step(u,'admin:key',{**s,'pdf_id':doc['file_id']});self.display(u,'🔐 <b>Javob kalitini yuboring.</b>\n\nMasalan: <code>1a2b3c</code> yoki <code>ABC</code>\nKalit o‘quvchilarga ko‘rsatilmaydi.',keys([('⬅️ Admin','a:home')]));return
        if step=='admin:key':
            count=len(re.findall(r'[A-Da-d]',text));answers=parse_answers(text,count)
            if not 1<=count<=100:raise ValueError('1–100 ta javob kerak.')
            mat=self.db.call('POST','cb909_materials',value={**{k:s[k] for k in ('group_id','cycle_start','day','code','pdf_id')},'answer_key':answers})[0]
            self.step(u,'admin:existing',{'material':mat['id']});self.display(u,'✅ <b>Test qoralamasi saqlandi.</b>\n\nEndi retelling matni yoki rasmini qo‘shing.',keys([('👁 Oldindan ko‘rish','a:preview')],[('🎙 Retelling yuklash','a:retell')],[('🎧 Namuna audio','a:audio')],[('✅ Nashr qilish','a:publish')],[('⬅️ Admin','a:home')]));return
        if step=='admin:audio':
            f=media(m)
            if not f or f['kind'] not in ('audio','voice','document'):raise ValueError('Audio fayl yoki ovozli xabar yuboring.')
            if f['kind']=='document' and not (m.get('document') or {}).get('mime_type','').startswith('audio/'):raise ValueError('Audio fayl yuboring.')
            self.db.patch('cb909_materials',{'retell_audio_id':f['file_id'],'retell_audio_kind':f['kind']},id='eq.'+s['material'])
            self.display(u,'✅ Namuna audio saqlandi.',keys([('⬅️ Admin','a:home')]))
            return
        if step=='admin:retell':
            photo=(m.get('photo') or [])
            if not text and not photo:raise ValueError('Retelling matni yoki matnli rasm yuboring.')
            values={'retell_text':text or m.get('caption',''),'retell_photo_id':photo[-1]['file_id'] if photo else None}
            if len(values['retell_text'])>3500:raise ValueError('Matn 3500 belgidan oshmasin yoki rasm sifatida yuboring.')
            self.db.patch('cb909_materials',values,id='eq.'+s['material']);self.step(u,'admin:existing',s);self.display(u,'✅ Retelling saqlandi.',keys([('✅ Nashr qilish','a:publish')],[('⬅️ Admin','a:home')]));return
        self.admin(u,'a:home')

    def preview(self,u,mid):
        from .scheduler import enqueue
        from .core import test_caption,retell_caption
        from uuid import uuid4
        mat=self.db.one('cb909_materials',id='eq.'+mid)
        if not mat:raise ValueError('Material topilmadi.')
        prefix='preview:'+str(uuid4())
        enqueue(self.db,prefix+':pdf',OWNER,'sendDocument',{'document':mat['pdf_id'],'caption':test_caption(mat['day'],safe(mat.get('title') or 'Grammar Challenge'),safe(mat['code'])),'parse_mode':'HTML'})
        if mat.get('retell_photo_id'):enqueue(self.db,prefix+':photo',OWNER,'sendPhoto',{'photo':mat['retell_photo_id'],'caption':retell_caption(mat['day'],bool(mat.get('retell_audio_id')))})
        elif mat.get('retell_text'):enqueue(self.db,prefix+':photo',OWNER,'sendMessage',{'text':retell_caption(mat['day'],bool(mat.get('retell_audio_id')))+'\n\n'+mat['retell_text']})
        if mat.get('retell_audio_id'):
            kind=mat.get('retell_audio_kind') or 'audio';payload={kind:mat['retell_audio_id']}
            if mat.get('retell_photo_id') or mat.get('retell_text'):payload['_after']=prefix+':photo'
            enqueue(self.db,prefix+':audio',OWNER,{'voice':'sendVoice','audio':'sendAudio','document':'sendDocument'}[kind],payload)
        self.display(u,'👁 PDF va retelling nusxalari faqat sizga yuboriladi. Guruhga tarqatilmadi.',keys([('⬅️ Admin','a:home')]))
