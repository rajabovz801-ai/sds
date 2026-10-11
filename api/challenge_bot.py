import os,hmac
from fastapi import FastAPI,Request
from fastapi.responses import JSONResponse
from lib.bot909.store import Store,Telegram
from lib.bot909.engine import Bot
from lib.bot909.core import OWNER
from lib.bot909.scheduler import schedule,drain
app=FastAPI()

def authorized(actual,name):
    expected=os.environ.get(name,'')
    return bool(expected) and hmac.compare_digest(actual or '',expected)

@app.post('/{path:path}')
async def webhook(request:Request,path:str=''):
    if request.headers.get('x-bot909-setup'):
        if not authorized(request.headers.get('x-bot909-setup'),'BOT909_SETUP_AUTH'):
            return JSONResponse({'ok':False},status_code=401)
        stage='request'
        try:
            setup=await request.json();action=setup.get('action')
            stage='token';tg=Telegram()
            if action=='connect':
                url=os.environ['BOT909_WEBHOOK_URL'];secret=os.environ['TELEGRAM_WEBHOOK_SECRET']
                if not url.startswith('https://') or not secret:raise ValueError('Invalid setup')
                tg.call('setWebhook',url=url,secret_token=secret,allowed_updates=['message','callback_query','my_chat_member'],drop_pending_updates=False)
                tg.call('setChatMenuButton',menu_button={'type':'commands'})
                tg.call('setMyCommands',commands=[{'command':'start','description':'909 Challenge boshlash'}])
                tg.call('setMyCommands',scope={'type':'chat','chat_id':OWNER},commands=[{'command':'start','description':'Challenge boshlash'},{'command':'admin','description':'909 admin panel'}])
            elif action=='import_day':
                from lib.bot909.materials import import_day
                return {'ok':True,**import_day(Store(),tg,int(setup.get('day',0)),setup.get('groups',[]))}
            elif action=='import_retell':
                from lib.bot909.materials import import_retell
                return {'ok':True,**import_retell(Store(),tg,int(setup.get('day',0)),setup.get('component'))}
            elif action=='activate':
                db=Store();Bot(db,tg).admin(Bot(db,tg).user(OWNER),'a:activate')
            elif action=='run_jobs':
                db=Store();schedule(db);drain(db,tg,limit=10)
            elif action=='preview_test':
                from lib.bot909.core import test_caption
                db=Store();g=db.one('cb909_groups',is_test='eq.true',active='eq.true');real=db.one('cb909_groups',label='eq.909',is_test='eq.false')
                if not g or not real:raise ValueError('Sinov guruhi topilmadi.')
                m=db.one('cb909_materials',group_id='eq.'+str(real['chat_id']),cycle_start='eq.'+real['start_date'],day='eq.1')
                if not m:raise ValueError('Material topilmadi.')
                from lib.bot909.scheduler import enqueue
                prefix='preview:'+real['start_date']+':'+str(g['chat_id'])
                enqueue(db,prefix+':pdf',g['chat_id'],'sendDocument',{'document':m['pdf_id'],'caption':test_caption(1,m['title'],m['code']),'parse_mode':'HTML'})
                enqueue(db,prefix+':photo',g['chat_id'],'sendPhoto',{'photo':m['retell_photo_id'],'caption':'🎙 1-KUN · RETELLING\n\nMatnni o‘qing, audioni tinglang va o‘z so‘zlaringiz bilan qayta hikoya qilib @ArkTutorBot ga yuboring.\n\n⏰ 21:00 gacha\n💬 Yordam: @rustam_usmon0v'})
                enqueue(db,prefix+':audio',g['chat_id'],'sendAudio',{'audio':m['retell_audio_id'],'_after':prefix+':photo'})
                drain(db,tg,limit=3)
            elif action=='preflight':
                db=Store();me=tg.call('getMe');groups=[]
                for g in db.get('cb909_groups',active='eq.true'):
                    member=tg.call('getChatMember',chat_id=g['chat_id'],user_id=me['id'])
                    groups.append({'label':g['label'],'start_date':g.get('start_date'),'is_test':g.get('is_test'),'bot_status':member['status']})
                c=db.one('cb909_settings',id='eq.true') or {}
                return {'ok':True,'groups':groups,'channel_bot_status':tg.call('getChatMember',chat_id=c['channel_id'],user_id=me['id'])['status']}
            elif action!='inspect':return JSONResponse({'ok':False},status_code=400)
            stage='getMe';me=tg.call('getMe')
            stage='getWebhookInfo';info=tg.call('getWebhookInfo')
            stage='database_init';db=Store()
            stage='database_read';settings=db.one('cb909_settings',id='eq.true') or {}
            return {'ok':True,'username':me['username'],'webhook':info['url'],'pending':info['pending_update_count'],'last_error':info.get('last_error_message'),'challenge_active':settings.get('active',False),'menu':tg.call('getChatMenuButton'),'owner_commands':tg.call('getMyCommands',scope={'type':'chat','chat_id':OWNER})}
        except Exception as error:
            diagnostic=str(error) if isinstance(error,RuntimeError) else type(error).__name__
            return JSONResponse({'ok':False,'error':diagnostic,'stage':stage,'reason_type':type(getattr(error,'reason',None)).__name__,'category':'header' if 'header' in str(error).lower() else 'url' if 'url' in str(error).lower() else 'other'},status_code=503)
    if not authorized(request.headers.get('x-telegram-bot-api-secret-token'),'TELEGRAM_WEBHOOK_SECRET'):
        return JSONResponse({'ok':False},status_code=401)
    body=await request.body()
    if len(body)>1_000_000:return JSONResponse({'ok':False},status_code=413)
    try:
        import json
        update=json.loads(body);event=update.get('my_chat_member') or update.get('callback_query') or update.get('message') or {};uid=event.get('from',{}).get('id')
        if not uid or not isinstance(update.get('update_id'),int):return {'ok':True}
        db=Store();tg=Telegram();bot=Bot(db,tg)
        claim=db.rpc('cb909_claim',{'p_update':update['update_id'],'p_actor':uid})
        if claim=='done':return {'ok':True}
        if claim!='claimed':return JSONResponse({'ok':False},status_code=503)
        try:bot.handle(update)
        except ValueError as error:bot.display(bot.user(uid),str(error))
        db.patch('cb909_updates',{'status':'done'},update_id='eq.'+str(update['update_id']))
        drain(db,tg);return {'ok':True}
    except Exception:
        # No token, message payload, or secret is returned in errors.
        return JSONResponse({'ok':False,'error':'Temporary processing failure'},status_code=503)

@app.get('/{path:path}')
def jobs(request:Request,path:str=''):
    if not authorized(request.headers.get('authorization'),'BOT909_JOB_AUTH'):
        return JSONResponse({'ok':False},status_code=401)
    db=Store();tg=Telegram();schedule(db);drain(db,tg,limit=30);return {'ok':True}
