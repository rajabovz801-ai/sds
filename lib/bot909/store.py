import json, os
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError

class Store:
    def __init__(self):
        self.url = (os.environ.get('BOT909_SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or 'https://svdigxqdivcmljirjwhk.supabase.co').strip().rstrip('/')
        self.key = (os.environ.get('SUPABASE_SECRET_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or '').strip()
        if not self.key: raise RuntimeError('Database key is not configured')
    def call(self, method, table, query=None, value=None, prefer='return=representation'):
        url = self.url+'/rest/v1/'+table
        if query: url += '?'+urlencode(query)
        headers={'apikey':self.key,'Authorization':'Bearer '+self.key,'Content-Type':'application/json','Prefer':prefer}
        req=Request(url,data=json.dumps(value).encode() if value is not None else None,headers=headers,method=method)
        try:
            with urlopen(req,timeout=15) as response:
                return json.loads(response.read() or b'null')
        except HTTPError as error:
            # Never include credentials or full user payloads in logs.
            raise RuntimeError('Database request failed: '+str(error.code)) from None
    def get(self, table, **query):return self.call('GET',table,query) or []
    def one(self, table, **query):
        rows=self.get(table,limit=1,**query);return rows[0] if rows else None
    def upsert(self, table, value, conflict):
        return self.call('POST',table,{'on_conflict':conflict},value,'resolution=merge-duplicates,return=representation')
    def patch(self, table, value, **query):return self.call('PATCH',table,query,value)
    def rpc(self, name, value):return self.call('POST','rpc/'+name,value=value)

class Telegram:
    def __init__(self):
        self.token=os.environ.get('TELEGRAM_BOT_TOKEN','').strip()
        if not self.token:raise RuntimeError('Bot token is not configured')
    def call(self, method, **payload):
        req=Request('https://api.telegram.org/bot'+self.token+'/'+method,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
        try:
            with urlopen(req,timeout=15) as response: result=json.load(response)
        except HTTPError:
            raise RuntimeError('Telegram request failed: '+method) from None
        if not result.get('ok'):raise RuntimeError('Telegram request rejected: '+method)
        return result['result']
