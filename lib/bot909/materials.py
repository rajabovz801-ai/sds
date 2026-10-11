"""Owner-only import of reviewed, packaged challenge PDFs and answer keys."""
import base64,hashlib,json
from pathlib import Path
from .core import OWNER
ROOT=Path(__file__).with_name('materials')

def bundle():
    data=json.loads((ROOT/'manifest.json').read_text())
    if len(data['days'])!=7:raise ValueError('Materiallar to‘liq emas.')
    return data

def import_day(db,tg,day,group_ids):
    row=next((r for r in bundle()['days'] if r['day']==day),None)
    if not row or not group_ids:raise ValueError('Kun yoki guruh tanlanmagan.')
    groups=[]
    for gid in group_ids:
        g=db.one('cb909_groups',chat_id='eq.'+str(gid))
        if not g or not g['active'] or not g.get('start_date'):raise ValueError('Faol guruh topilmadi.')
        existing=db.one('cb909_materials',group_id='eq.'+str(gid),cycle_start='eq.'+g['start_date'],day='eq.'+str(day))
        if existing:
            if existing.get('code')!=row['code'] or existing.get('answer_key')!=row['answer_key']:raise ValueError('Bu kunda boshqa test bor. Avval admin orqali tekshiring.')
        else:groups.append(g)
    if not groups:return {'day':day,'created':0}
    data=base64.b64decode((ROOT/row['pdf']).read_text(),validate=True)
    if hashlib.sha256(data).hexdigest()!=row['sha256']:raise ValueError('PDF tekshiruvi o‘tmadi.')
    # PDF is uploaded to the owner only. Public group posting belongs to scheduler.
    sent=tg.upload('sendDocument','document',f'day{day:02d}.pdf',data,chat_id=OWNER,caption=f'📦 {day}-kun · Admin nusxasi. Guruhlarga hali yuborilmadi.')
    for g in groups:
        db.upsert('cb909_materials',{'group_id':g['chat_id'],'cycle_start':g['start_date'],'day':day,'code':row['code'],'title':row['title'],'pdf_id':sent['document']['file_id'],'answer_key':row['answer_key'],'accepted_alternatives':row.get('accepted_alternatives',{}),'published':True},'group_id,cycle_start,day')
    return {'day':day,'created':len(groups)}


def import_retell(db,tg,day,component):
    row=next((r for r in bundle()['days'] if r['day']==day),None)
    g=db.one('cb909_groups',label='eq.909',is_test='eq.false')
    if not row or not g or not g.get('start_date') or component not in ('photo','audio'):raise ValueError('Retelling parametrlari noto‘g‘ri.')
    m=db.one('cb909_materials',group_id='eq.'+str(g['chat_id']),cycle_start='eq.'+g['start_date'],day='eq.'+str(day))
    if not m:raise ValueError('Avval PDF yuklang.')
    field='retell_'+component+'_id'
    if m.get(field):return {'day':day,'component':component,'created':False}
    path=ROOT/row['retell'][component]
    content=path.read_bytes()
    if hashlib.sha256(content).hexdigest()!=row['retell'][component+'_sha256']:raise ValueError('Retelling fayli tekshiruvi o‘tmadi.')
    sent=tg.upload('sendPhoto' if component=='photo' else 'sendAudio',component,path.name,content,content_type='image/png' if component=='photo' else 'audio/mpeg',chat_id=OWNER,caption=f'📦 909 · {day}-kun · Retelling admin nusxasi')
    values={field:sent['photo'][-1]['file_id'] if component=='photo' else sent['audio']['file_id'],'retell_text':row['retell']['text']}
    if component=='audio':values['retell_audio_kind']='audio'
    db.patch('cb909_materials',values,id='eq.'+m['id'])
    return {'day':day,'component':component,'created':True}
