"""Run after deployment. Credentials are read only from the environment."""
import os,re
from lib.bot909.store import Telegram
from lib.bot909.core import OWNER
def main():
    url=os.environ['BOT909_WEBHOOK_URL'];secret=os.environ['TELEGRAM_WEBHOOK_SECRET']
    if not url.startswith('https://') or not re.fullmatch(r'[A-Za-z0-9_-]{1,256}',secret):raise ValueError('Invalid webhook configuration')
    tg=Telegram()
    tg.call('setWebhook',url=url,secret_token=secret,allowed_updates=['message','callback_query','my_chat_member'],drop_pending_updates=False)
    tg.call('setChatMenuButton',menu_button={'type':'commands'})
    tg.call('setMyCommands',commands=[{'command':'start','description':'909 Challenge boshlash'}])
    tg.call('setMyCommands',scope={'type':'chat','chat_id':OWNER},commands=[{'command':'start','description':'Challenge boshlash'},{'command':'admin','description':'909 admin panel'}])
    print('Webhook and owner command configured.')
if __name__=='__main__':main()
