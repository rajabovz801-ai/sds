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
        try:
            action=(await request.json()).get('action')
            tg=Telegram()
            if action=='connect':
                url=os.environ['BOT909_WEBHOOK_URL'];secret=os.environ['TELEGRAM_WEBHOOK_SECRET']
                if not url.startswith('https://') or not secret:raise ValueError('Invalid setup')
                tg.call('setWebhook',url=url,secret_token=secret,allowed_updates=['message','callback_query','my_chat_member'],drop_pending_updates=False)
                tg.call('setChatMenuButton',menu_button={'type':'commands'})
                tg.call('setMyCommands',commands=[{'command':'start','description':'909 Challenge boshlash'}])
                tg.call('setMyCommands',scope={'type':'chat','chat_id':OWNER},commands=[{'command':'start','description':'Challenge boshlash'},{'command':'admin','description':'909 admin panel'}])
            elif action!='inspect':return JSONResponse({'ok':False},status_code=400)
            me=tg.call('getMe');info=tg.call('getWebhookInfo')
            db=Store();settings=db.one('cb909_settings',id='eq.true') or {}
            return {'ok':True,'username':me['username'],'webhook':info['url'],'pending':info['pending_update_count'],'last_error':info.get('last_error_message'),'challenge_active':settings.get('active',False),'menu':tg.call('getChatMenuButton'),'owner_commands':tg.call('getMyCommands',scope={'type':'chat','chat_id':OWNER})}
        except Exception:return JSONResponse({'ok':False,'error':'Setup failed'},status_code=503)
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
        m=update.get('message') or {}
        if m.get('chat',{}).get('type')=='private':
            try:tg.call('deleteMessage',chat_id=uid,message_id=m['message_id'])
            except RuntimeError:pass
        drain(db,tg);return {'ok':True}
    except Exception:
        # No token, message payload, or secret is returned in errors.
        return JSONResponse({'ok':False,'error':'Temporary processing failure'},status_code=503)

@app.get('/{path:path}')
def jobs(request:Request,path:str=''):
    if not authorized(request.headers.get('authorization'),'BOT909_JOB_AUTH'):
        return JSONResponse({'ok':False},status_code=401)
    db=Store();tg=Telegram();schedule(db);drain(db,tg,limit=30);return {'ok':True}
