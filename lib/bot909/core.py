"""Pure challenge rules. All times are Asia/Tashkent, never browser supplied."""
import re
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
OWNER = 5170628705
TZ = ZoneInfo('Asia/Tashkent')

def local_now():
    return datetime.now(TZ)

def day_number(start, current):
    return (current.date() - start).days + 1

def accepts(start, current):
    return 1 <= day_number(start, current) <= 7 and current.time().replace(tzinfo=None) < time(21)

def parse_answers(text, count, options='ABCD'):
    raw = re.sub(r'[\s,;.!:()\-–—]+', '', str(text)).upper()
    if not raw:
        raise ValueError('Javoblar bo‘sh. Masalan: 1a2b3c')
    if re.fullmatch('['+options+']+', raw):
        if len(raw) != count:
            raise ValueError(f'{count} ta javob kerak; siz {len(raw)} ta yozdingiz.')
        return list(raw)
    pairs = re.findall(r'(\d+)(['+options+'])', raw)
    if ''.join(n+a for n,a in pairs) != raw:
        raise ValueError('Javob shakli noto‘g‘ri. Masalan: 1a2b3c yoki 1A 2B 3C')
    result = {}
    for number, answer in pairs:
        n = int(number)
        if n in result:
            raise ValueError(f'{n}-savol ikki marta yozilgan. Tuzating.')
        if n < 1 or n > count:
            raise ValueError(f'Savol raqami 1–{count} orasida bo‘lsin.')
        result[n] = answer
    missing = sorted(set(range(1,count+1))-result.keys())
    if missing:
        raise ValueError('Javobi yo‘q savollar: '+', '.join(map(str,missing)))
    return [result[n] for n in range(1,count+1)]

def grade(answers, key):
    wrong = [i+1 for i,(a,k) in enumerate(zip(answers,key)) if a != k]
    return {'score':len(key)-len(wrong), 'total':len(key), 'percent':round((len(key)-len(wrong))*100/len(key),1), 'wrong':wrong}

def media(message):
    for kind in ('voice','audio','video','video_note'):
        if message.get(kind):
            return {'kind':kind,'file_id':message[kind]['file_id']}
    document = message.get('document') or {}
    if document.get('mime_type','').startswith(('audio/','video/')):
        return {'kind':'document','file_id':document['file_id']}
    return None
