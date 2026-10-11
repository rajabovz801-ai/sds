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
    def get_all(self,table,**query):
        rows=[];offset=0
        while True:
            page=self.get(table,limit=500,offset=offset,**query);rows.extend(page)
            if len(page)<500:return rows
            offset+=500
    def one(self, table, **query):
        rows=self.get(table,limit=1,**query);return rows[0] if rows else None
    def upsert(self, table, value, conflict):
        return self.call('POST',table,{'on_conflict':conflict},value,'resolution=merge-duplicates,return=representation')
    def patch(self, table, value, **query):return self.call('PATCH',table,query,value)
    def rpc(self, name, value):return self.call('POST','rpc/'+name,value=value)

class TelegramError(RuntimeError):
    def __init__(self,code=None,description='Telegram bilan aloqa uzildi; yuborilgani noma’lum.',retry_after=None):
        self.code=code;self.retry_after=retry_after
        self.safe_description=description[:240]
        super().__init__(self.safe_description)

class Telegram:
    def __init__(self):
        self.token=os.environ.get('TELEGRAM_BOT_TOKEN','').strip()
        if not self.token:raise RuntimeError('Bot token is not configured')
    def request(self,req,timeout=15):
        try:
            with urlopen(req,timeout=timeout) as response:result=json.load(response)
        except HTTPError as error:
            try:result=json.loads(error.read())
            except Exception:result={'error_code':error.code,'description':'Telegram HTTP '+str(error.code)}
        except Exception:
            raise TelegramError() from None
        if not result.get('ok'):
            raise TelegramError(result.get('error_code'),result.get('description','Telegram so‘rovni rad etdi'),result.get('parameters',{}).get('retry_after'))
        return result['result']
    def call(self, method, **payload):
        req=Request('https://api.telegram.org/bot'+self.token+'/'+method,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
        return self.request(req)

    def upload(self,method,field,filename,data,content_type="application/pdf",**payload):
        import secrets
        boundary='bot909'+secrets.token_hex(16)
        chunks=[]
        for key,value in payload.items():
            chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
        chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{filename}"\r\nContent-Type: {content_type}\r\n\r\n'.encode()+data+b'\r\n')
        chunks.append(f'--{boundary}--\r\n'.encode())
        req=Request('https://api.telegram.org/bot'+self.token+'/'+method,data=b''.join(chunks),headers={'Content-Type':'multipart/form-data; boundary='+boundary})
        return self.request(req,timeout=25)
