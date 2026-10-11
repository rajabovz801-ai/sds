"""Durable group-local schedules, private HTML snapshots and safe delivery retries."""
from datetime import date,datetime,timedelta
import time
from .core import OWNER,local_now,day_number,test_caption,challenge_start,retell_caption,CHALLENGE_GROUP
from .engine import safe
from .reports import group_report,summary,render_html
from .store import TelegramError

def enqueue(db,key,chat,method,payload):
    db.call('POST','cb909_outbox',{'on_conflict':'dedupe'},dict(dedupe=key,chat_id=chat,method=method,payload=payload,priority=0 if chat<0 else 20 if '_html' in payload else 50),'resolution=ignore-duplicates,return=representation')

def reports(db,c,now):
    result=[]
    for g in db.get('cb909_groups',chat_id='eq.'+str(CHALLENGE_GROUP),active='eq.true',is_test='eq.false'):
        g={**g,'start_date':challenge_start(g,c)}
        if g['start_date']:result.append(summary(group_report(db,g,now)))
    return result or ['Guruhlarning boshlanish sanasi hali belgilanmagan.']

def schedule(db,now=None):
    now=now or local_now();c=db.one('cb909_settings',id='eq.true') or {}
    if not c.get('active'):return
    closed=[]
    for group in db.get('cb909_groups',chat_id='eq.'+str(CHALLENGE_GROUP),active='eq.true',is_test='eq.false'):
        g={**group,'start_date':challenge_start(group,c)}
        if not g['start_date']:continue
        day=day_number(date.fromisoformat(g['start_date']),now)
        if not 1<=day<=7:continue
        mat=db.one('cb909_materials',group_id='eq.'+str(g['chat_id']),cycle_start='eq.'+g['start_date'],day='eq.'+str(day),published='eq.true')
        prefix=f'{g["start_date"]}:{g["chat_id"]}:{day}'
        guard={'_group':g['chat_id'],'_cycle':g['start_date']}
        expires=now.replace(hour=21,minute=0,second=0,microsecond=0).isoformat()
        task_guard={**guard,'_expires':expires}
        if not mat:
            if now.hour>=8:enqueue(db,prefix+':missing',OWNER,'sendMessage',{'text':f'⚠️ {g["label"]}: {day}-kun uchun nashr qilingan test yo‘q.'})
        else:
            if 8<=now.hour<21:
                enqueue(db,prefix+':pdf',g['chat_id'],'sendDocument',{**task_guard,'document':mat['pdf_id'],'caption':test_caption(day,safe(mat.get('title') or 'Grammar Challenge'),safe(mat['code'])),'parse_mode':'HTML'})
            if now.hour>=15 and (not (mat.get('retell_photo_id') or mat.get('retell_text')) or not mat.get('retell_audio_id')):
                enqueue(db,prefix+':retell-warning',OWNER,'sendMessage',{'text':f'⚠️ {g["label"]} · {day}-kun: retelling matni/rasmi yoki namuna audio yetishmayapti. /admin → Test va retelling.'})
            if 16<=now.hour<21 and (mat.get('retell_photo_id') or mat.get('retell_text')):
                text=retell_caption(day,bool(mat.get('retell_audio_id')))
                photo_key=prefix+':photo'
                if mat.get('retell_photo_id'):enqueue(db,photo_key,g['chat_id'],'sendPhoto',{**task_guard,'photo':mat['retell_photo_id'],'caption':text})
                else:enqueue(db,photo_key,g['chat_id'],'sendMessage',{**task_guard,'text':text+'\n\n'+mat['retell_text']})
                if mat.get('retell_audio_id'):
                    kind=mat.get('retell_audio_kind') or 'audio';method={'audio':'sendAudio','voice':'sendVoice','document':'sendDocument'}[kind]
                    payload={**task_guard,kind:mat['retell_audio_id']}
                    payload['_after']=photo_key
                    enqueue(db,prefix+':audio',g['chat_id'],method,payload)
        if now.hour>=21:
            report=group_report(db,g,now);closed.append(report)
            text=summary(report)
            enqueue(db,prefix+':report',g['chat_id'],'sendMessage',{**guard,'text':text,'parse_mode':'HTML'})
            enqueue(db,prefix+':owner-report',OWNER,'sendMessage',{'text':text,'parse_mode':'HTML'})
    if closed:
        enqueue(db,now.date().isoformat()+':owner-html',OWNER,'sendDocument',{'_html':render_html(closed),'_filename':'ARK_Challenge_'+now.date().isoformat()+'.html','caption':'📊 Kunlik HTML hisobot · Natijalar va coinlar'})

def delivery_notice(db,item,text):
    if ':delivery-alert' in item['dedupe']:return
    enqueue(db,item['dedupe']+':delivery-alert',OWNER,'sendMessage',{'text':'⚠️ Tarqatish muammosi\n'+item['dedupe']+'\n'+text+'\n/admin → Tarqatish holati orqali tekshiring.'})

def cancel(db,item,reason):
    db.patch('cb909_outbox',{'status':'failed','error_summary':reason,'error_code':410},id='eq.'+item['id'],status='eq.pending')

def drain(db,tg,limit=8):
    started=time.monotonic();now=local_now();stale=(now-timedelta(minutes=3)).isoformat()
    for item in db.get('cb909_outbox',status='eq.sending',claimed_at='lt.'+stale,limit=5):
        claimed=db.patch('cb909_outbox',{'status':'uncertain','error_summary':'Yuborish uzilgan; xabar ketgani noma’lum.'},id='eq.'+item['id'],status='eq.sending')
        if claimed:delivery_notice(db,item,'Yuborish uzilgan. Avval guruhdagi xabarni tekshiring.')
    count=0
    for item in db.get('cb909_outbox',status='eq.pending',next_attempt_at='lte.'+now.isoformat(),order='priority.asc,created_at.asc',limit=100):
        if count>=limit or time.monotonic()-started>20:break
        payload=dict(item['payload']);dependency=payload.pop('_after',None)
        menu=payload.pop('_menu',False)
        group_id=payload.pop('_group',None);cycle=payload.pop('_cycle',None);expires=payload.pop('_expires',None)
        # Public scheduled messages are checked again immediately before claiming them.
        paused=False
        if group_id is not None or item['chat_id']<0 and not item['dedupe'].startswith('preview:'):
            group_id=group_id or item['chat_id']
            group=db.one('cb909_groups',chat_id='eq.'+str(group_id)) or {};settings=db.one('cb909_settings',id='eq.true') or {}
            if group_id!=CHALLENGE_GROUP or cycle and group.get('start_date')!=cycle:
                cancel(db,item,'Bu guruh yoki challenge tarqatishda qatnashmaydi.');continue
            paused=not group.get('active') or not settings.get('active')
            if not expires and item['dedupe'].endswith((':pdf',':photo',':retell',':audio')):
                parts=item['dedupe'].split(':')
                if len(parts)>=4:
                    try:expires=(datetime.fromisoformat(parts[0]).replace(tzinfo=now.tzinfo)+timedelta(days=int(parts[2])-1)).replace(hour=21).isoformat()
                    except (ValueError,TypeError):cancel(db,item,'Topshiriq muddati aniqlanmadi.');continue
        if expires and local_now()>=datetime.fromisoformat(expires):
            cancel(db,item,'Topshiriqning 21:00 muddati tugagan.');delivery_notice(db,item,'Muddati o‘tgan topshiriq guruhga yuborilmadi.');continue
        if paused:continue
        if dependency:
            parent=db.one('cb909_outbox',dedupe='eq.'+dependency)
            if parent and parent['status'] in ('failed','uncertain'):
                db.patch('cb909_outbox',{'status':'failed','error_summary':'Oldingi xabar yuborilmagan; avval uni tekshiring.'},id='eq.'+item['id'],status='eq.pending');continue
            if not parent or parent['status']!='sent':continue
            payload['reply_parameters']={'message_id':parent['message_id']}
        # Do not let one recipient exhaust Telegram's chat/group rate limits.
        recent=db.get('cb909_outbox',chat_id='eq.'+str(item['chat_id']),status='eq.sent',sent_at='gt.'+(local_now()-timedelta(seconds=60)).isoformat(),order='sent_at.desc',limit=20)
        if len(recent)>=20:continue
        if recent:
            gap=(local_now()-__import__('datetime').datetime.fromisoformat(recent[0]['sent_at'])).total_seconds()
            if gap<1:time.sleep(1.05-gap)
        attempts=item.get('attempts',0)+1
        claim=db.patch('cb909_outbox',{'status':'sending','claimed_at':local_now().isoformat(),'attempts':attempts},id='eq.'+item['id'],status='eq.pending')
        if not claim:continue
        count+=1
        try:
            if '_html' in payload:
                content=payload.pop('_html').encode();filename=payload.pop('_filename')
                sent=tg.upload('sendDocument','document',filename,content,content_type='text/html; charset=utf-8',chat_id=item['chat_id'],**payload)
            else:sent=tg.call(item['method'],chat_id=item['chat_id'],**payload)
            if menu:
                db.patch('cb909_users',{'menu_id':sent.get('message_id')},telegram_id='eq.'+str(item['chat_id']),step='eq.home')
            db.patch('cb909_outbox',{'status':'sent','message_id':sent.get('message_id'),'sent_at':local_now().isoformat(),'error_summary':None,'error_code':None},id='eq.'+item['id'])
        except TelegramError as error:
            retry=(error.code==429 or error.code is not None and error.code>=500) and attempts<6
            status='pending' if retry else ('uncertain' if error.code is None else 'failed')
            values={'status':status,'error_code':error.code,'error_summary':error.safe_description}
            if retry:values['next_attempt_at']=(local_now()+timedelta(seconds=max(2,error.retry_after or 10*attempts))).isoformat()
            db.patch('cb909_outbox',values,id='eq.'+item['id'])
            if not retry:delivery_notice(db,item,error.safe_description)
        except Exception:
            db.patch('cb909_outbox',{'status':'uncertain','error_summary':'Natija noma’lum. Qayta yuborishdan oldin chatni tekshiring.'},id='eq.'+item['id'])
            delivery_notice(db,item,'Natija noma’lum; avtomatik takrorlanmadi.')
