"""Pure challenge rules. All times are Asia/Tashkent, never browser supplied."""
import re
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
OWNER = 5170628705
CHALLENGE_GROUP = -1002319452850
TZ = ZoneInfo('Asia/Tashkent')
ANSWER_HELP = '\n\nQuyidagi shakllardan birida yuboring:\n1a2b3c\n1A 2B 3C\n1-A, 2-B, 3-C'

def group_label(title):
    match = re.match(r'^\s*(\d{3,4})(?:\s|[-–—]|$)', title)
    return match.group(1) if match else title.strip()[:80]

def test_caption(day, title, code):
    return (f'📚 <b>{day}-KUN · {title}</b>\n🔑 Kod: <code>{code}</code>\n'
            '🤖 Javoblarni @ArkTutorBot ga yuboring.\n✍️ Namuna: <code>1a2b3c</code>\n'
            '⏰ <b>21:00 gacha</b>\n\n💬 Savol yoki muammo bo‘lsa: @rustam_usmon0v')

def local_now():
    return datetime.now(TZ)

def day_number(start, current):
    return (current.date() - start).days + 1

def accepts(start, current):
    return 1 <= day_number(start, current) <= 7 and time(8) <= current.time().replace(tzinfo=None) < time(21)

def parse_answers(text, count, options='ABCD'):
    raw = re.sub(r'[\s,;.!:()\-–—]+', '', str(text)).upper()
    if not raw:
        raise ValueError('Javoblar bo‘sh.' + ANSWER_HELP)
    if re.fullmatch('['+options+']+', raw):
        if len(raw) != count:
            raise ValueError(f'{count} ta javob kerak; siz {len(raw)} ta yozdingiz.' + ANSWER_HELP)
        return list(raw)
    pairs = re.findall(r'(\d+)(['+options+'])', raw)
    if ''.join(n+a for n,a in pairs) != raw:
        raise ValueError('Javob shakli noto‘g‘ri. Faqat A, B, C yoki D variantlarini yozing.' + ANSWER_HELP)
    result = {}
    for number, answer in pairs:
        n = int(number)
        if n in result:
            raise ValueError(f'{n}-savol ikki marta yozilgan. Tuzating.' + ANSWER_HELP)
        if n < 1 or n > count:
            raise ValueError(f'Savol raqami 1–{count} orasida bo‘lsin.' + ANSWER_HELP)
        result[n] = answer
    missing = sorted(set(range(1,count+1))-result.keys())
    if missing:
        raise ValueError('Javobi yo‘q savollar: '+', '.join(map(str,missing)) + ANSWER_HELP)
    return [result[n] for n in range(1,count+1)]

def grade(answers, key, alternatives=None):
    wrong = [i+1 for i,(a,k) in enumerate(zip(answers,key)) if a != k and a not in (alternatives or {}).get(str(i+1),[])]
    return {'score':len(key)-len(wrong), 'total':len(key), 'percent':round((len(key)-len(wrong))*100/len(key),1), 'wrong':wrong}

def media(message):
    for kind in ('voice','audio','video','video_note'):
        if message.get(kind):
            return {'kind':kind,'file_id':message[kind]['file_id']}
    document = message.get('document') or {}
    if document.get('mime_type','').startswith(('audio/','video/')):
        return {'kind':'document','file_id':document['file_id']}
    return None


def challenge_start(group, settings=None):
    return group.get('start_date') or (settings or {}).get('start_date')


def retell_caption(day,has_audio=True):
    return (f'🎙 {day}-KUN · RETELLING\n\nMatnni o‘qing, '+('audioni tinglang va ' if has_audio else '')+'o‘z so‘zlaringiz bilan qayta hikoya qilib @ArkTutorBot ga yuboring.\n\n⏰ 21:00 gacha\n💬 Yordam: @rustam_usmon0v')


def valid_name(value):
    parts=value.split()
    return 2<=len(parts)<=6 and len(value)<=80 and all(any(c.isalpha() for c in part) for part in parts) and all(c.isalpha() or c in " '-’‘ʻʼ" for c in value)
