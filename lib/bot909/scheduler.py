"""Durable scheduled delivery; invoke every minute from an external scheduler."""
from datetime import date
from .core import OWNER,local_now,day_number
from .engine import safe

def enqueue(db,key,chat,method,payload):
    db.call('POST','cb909_outbox',{'on_conflict':'dedupe'},dict(dedupe=key,chat_id=chat,method=method,payload=payload),'resolution=ignore-duplicates,return=representation')

def reports(db,c,now):
    if not c.get('start_date'):return ['Boshlanish sanasi belgilanmagan.']
    day=day_number(date.fromisoformat(c['start_date']),now);result=[]
    for g in db.get('cb909_groups',active='eq.true'):
        mat=db.one('cb909_materials',group_id='eq.'+str(g['chat_id']),day='eq.'+str(day))
        students=db.get('cb909_users',group_id='eq.'+str(g['chat_id']),order='name.asc')
        submissions=db.get('cb909_submissions',material_id='eq.'+mat['id']) if mat else []
        tests={r['student_id']:r for r in submissions if r['kind']=='test'};retells={r['student_id'] for r in submissions if r['kind']=='retell'}
        students.sort(key=lambda u:-(tests.get(u['telegram_id'],{}).get('score') or 0))
        lines=[f'📊 <b>{safe(g["label"])} · {day}-kun natijalari</b>']
        for i,u in enumerate(students,1):
            r=tests.get(u['telegram_id']);score=f'{r["score"]}/{r["total"]}' if r else 'topshirilmagan'
            lines.append(f'{i}. {safe(u["name"])} · 📝 {score} · 🎙 '+('✅' if u['telegram_id'] in retells else '❌'))
        # Split at complete lines so HTML entities and tags remain valid.
        chunk=''
        for line in lines or ['Hali natija yo‘q.']:
            if len(chunk)+len(line)>3500:result.append(chunk);chunk=''
            chunk+=line+'\n'
        result.append(chunk)
    return result or ['Faol guruh yo‘q.']

def schedule(db,now=None):
    now=now or local_now();c=db.one('cb909_settings',id='eq.true') or {}
    if not c.get('active') or not c.get('start_date'):return
    day=day_number(date.fromisoformat(c['start_date']),now)
    if not 1<=day<=7:return
    for g in db.get('cb909_groups',active='eq.true'):
        mat=db.one('cb909_materials',group_id='eq.'+str(g['chat_id']),day='eq.'+str(day),published='eq.true')
        prefix=f'{c["start_date"]}:{g["chat_id"]}:{day}'
        if not mat:
            if now.hour>=8:enqueue(db,prefix+':missing',OWNER,'sendMessage',{'text':f'⚠️ {g["label"]}: {day}-kun uchun nashr qilingan test yo‘q.'})
            continue
        if 8<=now.hour<21:
            enqueue(db,prefix+':pdf',g['chat_id'],'sendDocument',{'document':mat['pdf_id'],'caption':f'📚 {g["label"]} · {day}-kun\n🔑 Test kodi: {mat["code"]}\n📝 Javob namunasi: 1a2b3c\n⏰ 21:00 gacha botga yuboring.'})
        if 16<=now.hour<21 and (mat.get('retell_photo_id') or mat.get('retell_text')):
            text=f'🎙 {day}-kun · Retelling\n⏰ 21:00 gacha\n\n'+(mat.get('retell_text') or '')
            if mat.get('retell_photo_id'):
                enqueue(db,prefix+':photo',g['chat_id'],'sendPhoto',{'photo':mat['retell_photo_id'],'caption':text[:1000]})
                if len(text)>1000:enqueue(db,prefix+':text',g['chat_id'],'sendMessage',{'text':text})
            else:enqueue(db,prefix+':retell',g['chat_id'],'sendMessage',{'text':text})
    if now.hour>=21:
        for i,report in enumerate(reports(db,c,now)):
            # Reports are computed separately for each group, so route using label-independent grouping below.
            enqueue(db,f'{c["start_date"]}:{day}:owner-report:{i}',OWNER,'sendMessage',{'text':report,'parse_mode':'HTML'})
        for g in db.get('cb909_groups',active='eq.true'):
            class GroupStore:
                def get(self,table,**q):return [g] if table=='cb909_groups' else db.get(table,**q)
                def one(self,*a,**k):return db.one(*a,**k)
            for i,report in enumerate(reports(GroupStore(),c,now)):
                enqueue(db,f'{c["start_date"]}:{g["chat_id"]}:{day}:report:{i}',g['chat_id'],'sendMessage',{'text':report,'parse_mode':'HTML'})

def drain(db,tg,limit=8):
    for item in db.get('cb909_outbox',status='eq.pending',order='created_at.asc',limit=limit):
        claim=db.patch('cb909_outbox',{'status':'sending'},id='eq.'+item['id'],status='eq.pending')
        if not claim:continue
        try:
            sent=tg.call(item['method'],chat_id=item['chat_id'],**item['payload'])
            db.patch('cb909_outbox',{'status':'sent','message_id':sent.get('message_id'),'sent_at':local_now().isoformat()},id='eq.'+item['id'])
        except Exception:
            # Do not blindly resend after an ambiguous network timeout.
            db.patch('cb909_outbox',{'status':'failed'},id='eq.'+item['id'])
