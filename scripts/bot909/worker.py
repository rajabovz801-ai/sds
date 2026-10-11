"""Run on an always-on host; alternatively call protected jobs endpoint every minute."""
import time
from lib.bot909.store import Store,Telegram
from lib.bot909.scheduler import schedule,drain
while True:
    try:
        db=Store();tg=Telegram();schedule(db);drain(db,tg,30)
    except Exception:print('Job failed; check configuration and delivery panel.',flush=True)
    time.sleep(30)
