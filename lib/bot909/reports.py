"""Private, self-contained HTML snapshots. No public learner-data URLs."""
import html,hashlib
from collections import Counter
from datetime import date
from .core import day_number,challenge_start

def esc(value):return html.escape(str(value))
def all_rows(db,table,**query):return getattr(db,'get_all',db.get)(table,**query)

def group_report(db,g,now):
    start=challenge_start(g);day=day_number(date.fromisoformat(start),now) if start else 0
    materials=all_rows(db,'cb909_materials',group_id='eq.'+str(g['chat_id']),cycle_start='eq.'+str(start),order='day.asc') if start else []
    ids={m['id']:m['day'] for m in materials}
    students=all_rows(db,'cb909_users',group_id='eq.'+str(g['chat_id']),order='name.asc')
    submissions=all_rows(db,'cb909_submissions',material_id='in.('+','.join(ids)+')') if ids else []
    coins=all_rows(db,'cb909_coins',student_id='in.('+','.join(str(u['telegram_id']) for u in students)+')') if students else []
    rows=[]
    for u in students:
        uid=u['telegram_id'];history={n:{'test':None,'retell':False,'coins':0} for n in range(1,8)}
        for r in submissions:
            if r['student_id']!=uid:continue
            cell=history[ids[r['material_id']]]
            if r['kind']=='test':cell['test']=f'{r["score"]}/{r["total"]}'
            else:cell['retell']=True
        mine=[r for r in coins if r['student_id']==uid]
        for r in mine:
            if r['material_id'] in ids:history[ids[r['material_id']]]['coins']+=r['amount']
        rows.append({'student_id':uid,'name':u.get('name') or 'Ism kiritilmagan','history':history,'round_coins':sum(c['coins'] for c in history.values()),'total_coins':sum(r['amount'] for r in mine),'today':history.get(day,{'test':None,'retell':False,'coins':0})})
    rows.sort(key=lambda r:(-r['round_coins'],r['name'].casefold()))
    previous=None;rank=0
    for i,r in enumerate(rows,1):
        if previous!=r['round_coins']:rank=i
        r['rank']=rank;previous=r['round_coins']
    return {'group':g,'date':now.date().isoformat(),'day':day,'rows':rows,'start':start,'closed':day>=1 and now.hour>=21}

def summary(report):
    title=report['group']['label'];day=report['day'];rows=report['rows']
    label='Challenge hali boshlanmagan' if day<1 else ('Challenge yakuni' if day>7 else f'{day}-kun natijalari')
    lines=[f'📊 <b>{esc(title)} · {label}</b>','']
    names=Counter(r['name'] for r in rows)
    for r in rows[:15]:
        t=r['today'];name=esc(r['name'])+(' · '+hashlib.sha256(str(r.get('student_id','')).encode()).hexdigest()[:6].upper() if names[r['name']]>1 else '');lines.append(f'{r["rank"]}. {name} · 📝 {t["test"] or "—"} · 🎙 '+('✅' if t['retell'] else '❌')+f' · +{t["coins"]} 🪙 · Jami {r["round_coins"]} 🪙')
    if len(rows)>15:lines.append(f'\nEng yuqori 15 o‘rin ko‘rsatildi. Jami {len(rows)} qatnashchi.')
    if not rows:lines.append('Hali ro‘yxatdan o‘tgan o‘quvchi yo‘q.')
    lines.append(f'\nBajarilgan: test {sum(bool(r["today"]["test"]) for r in rows)}/{len(rows)}, retelling {sum(r["today"]["retell"] for r in rows)}/{len(rows)}.')
    return '\n'.join(lines)

def render_html(reports):
    sections=[]
    for report in reports:
        day_label='BOSHLANMAGAN' if report['day']<1 else ('YAKUNI' if report['day']>7 else str(report['day'])+'-KUN')
        status='Challenge hali boshlanmagan' if report['day']<1 else ('Qabul 21:00 da yopilgan' if report.get('closed') else 'Qabul 21:00 gacha')
        body=[]
        for r in report['rows']:
            t=r['today'];cells=[]
            for n in range(1,8):
                c=r['history'][n];label=(c['test'] or '—')+' · '+('R ✓' if c['retell'] else 'R —')
                cells.append(f'<td><span>{esc(label)}</span><small>+{c["coins"]} coin</small></td>')
            body.append(f'<tr><td class="rank">{r["rank"]}</td><th scope="row">{esc(r["name"])}<small>ID: {r.get("student_id","—")}</small></th><td>{esc(t["test"] or "Topshirilmagan")}</td><td>{"✓ Yuborilgan" if t["retell"] else "— Yuborilmagan"}</td><td class="coin">+{t["coins"]}</td><td class="coin">{r["round_coins"]}</td><td>{r["total_coins"]}</td>'+''.join(cells)+'</tr>')
        headers=''.join(f'<th>{n}-kun</th>' for n in range(1,8))
        rows=report['rows'];tests=sum(bool(r['today']['test']) for r in rows);retells=sum(r['today']['retell'] for r in rows)
        sections.append(f'<section><div class="section-head"><div><p class="eyebrow">{esc(report["date"])} · {day_label}</p><h2>{esc(report["group"]["title"])}</h2><p>Boshlanish: {esc(report["start"])} · {status}</p></div><span class="badge">7 KUNLIK CHALLENGE</span></div><div class="stats"><article><small>O‘quvchilar</small><strong>{len(rows)}</strong></article><article><small>Test topshirgan</small><strong>{tests}/{len(rows)}</strong></article><article><small>Retelling yuborgan</small><strong>{retells}/{len(rows)}</strong></article><article><small>Bugungi coinlar</small><strong>{sum(r["today"]["coins"] for r in rows)} <span>🪙</span></strong></article></div><div class="scroll"><table><thead><tr><th>O‘rin</th><th>Ism-familiya</th><th>Bugungi test</th><th>Retelling</th><th>Bugun 🪙</th><th>Challenge 🪙</th><th>Umumiy 🪙</th>{headers}</tr></thead><tbody>'+''.join(body or ['<tr><td colspan="14">Hali o‘quvchi yo‘q.</td></tr>'])+'</tbody></table></div></section>')
    return '''<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARK Education · Challenge hisoboti</title><style>
:root{--ink:#17283d;--muted:#617187;--blue:#245ec4;--gold:#956c0b}*{box-sizing:border-box}body{margin:0;background:#f1f5fa;color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:1480px;margin:auto;padding:32px 24px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:26px}h1{font-size:30px;margin:4px 0}h2{font-size:22px;margin:2px 0}p{margin:5px 0;color:var(--muted)}.eyebrow{letter-spacing:.12em;font-size:12px;font-weight:700;color:var(--blue)}.tools{display:flex;gap:8px;flex-wrap:wrap}input,button{font:inherit;border:1px solid #d7e0ed;background:white;padding:10px 14px;border-radius:10px}button{cursor:pointer;color:var(--blue)}section{background:white;border:1px solid #dce5f1;border-radius:18px;padding:24px;margin-bottom:24px}.section-head{display:flex;justify-content:space-between;gap:16px}.badge{align-self:start;background:#eaf1ff;color:var(--blue);padding:7px 12px;border-radius:8px;font-size:11px;font-weight:700}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.stats article{padding:14px 18px;background:#f7f9fc;border-radius:12px}.stats small{display:block;color:var(--muted)}.stats strong{font-size:25px}.stats span{font-size:18px}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;min-width:1100px;font-size:13px}th,td{text-align:left;padding:13px 10px;border-bottom:1px solid #e5eaf2;white-space:nowrap}thead th{background:#f6f8fc;color:var(--muted);font-weight:600}tbody th{min-width:160px}th small{display:block;font-weight:400;color:var(--muted);font-size:11px}tbody th{position:sticky;left:0;background:white;z-index:1}.rank{font-weight:700;color:var(--blue)}.coin{color:var(--gold);font-weight:750;background:#fffcf1}td small{display:block;color:var(--muted);font-size:11px}footer{font-size:13px;color:var(--muted)}@media(max-width:650px){main{padding:20px 12px}header,.section-head{flex-direction:column;align-items:start}h1{font-size:24px}section{padding:16px}.stats{grid-template-columns:repeat(2,1fr)}input{width:100%}}@media print{body{background:white}main{padding:0}.tools{display:none}section{break-inside:avoid}.scroll{overflow:visible}table{min-width:0;font-size:9px}th,td{padding:6px 3px}h1{font-size:22px}@page{size:A4 landscape;margin:12mm}}
</style></head><body><main><header><div><p class="eyebrow">ARK EDUCATION CENTRE</p><h1>Challenge hisoboti</h1><p>Kunlik natijalar va to‘plangan coinlar</p></div><div class="tools"><input id="search" placeholder="O‘quvchini qidirish…" aria-label="O‘quvchini qidirish"><button onclick="window.print()">Chop etish / PDF</button></div></header>'''+''.join(sections)+'''<footer>🪙 To‘g‘ri javob +1 · Retelling +10 · Ikkala vazifa +5 bonus. Teng coinga teng o‘rin.<br>Challenge coini shu bosqichga tegishli. Umumiy coinlar keyingi challenge’larda saqlanadi. Retelling sifati baholanmaydi.<br>@rustam_usmon0v · Ushbu hisobot administrator uchun.</footer></main><script>document.getElementById('search').addEventListener('input',function(){const q=this.value.toLocaleLowerCase();document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLocaleLowerCase().includes(q))});</script></body></html>'''
