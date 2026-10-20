"""Seven Tashkent calendar days of first-attempt accuracy, never estimated bands."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo('Asia/Tashkent')


def rank_coins(rows):
    rank, previous = 0, None
    for row in rows:
        coins = int(row.get('coins') or 0)
        if coins != previous:
            rank += 1
        row['rank'], previous = rank, coins
    return rows


def weekly_progress(reading, listening, today):
    dates = [(today - timedelta(days=n)).isoformat() for n in range(6, -1, -1)]
    totals = {d: {'reading': [0, 0], 'listening': [0, 0]} for d in dates}
    seen = set()
    for module, rows in (('reading', reading), ('listening', listening)):
        for row in sorted(rows, key=lambda x: str(x.get('submitted_at') or '')):
            try:
                stamp = datetime.fromisoformat(str(row['submitted_at']).replace('Z', '+00:00'))
                if stamp.tzinfo is None:
                    continue
                day = stamp.astimezone(TZ).date().isoformat()
                score = float(row['score'])
                total = float(row['total']) if module == 'reading' else 40
                if not 0 <= score <= total or total <= 0:
                    continue
                if module == 'listening':
                    key = row['day_number']
                    if key in seen:
                        continue
                    seen.add(key)
                if day not in totals:
                    continue
                totals[day][module][0] += score
                totals[day][module][1] += total
            except (ValueError, TypeError, KeyError, OverflowError):
                continue
    days = [{'date': d, **{m: round(v[0] / v[1] * 100, 1) if v[1] else None for m, v in totals[d].items()}} for d in dates]
    change = {}
    for module in ('reading', 'listening'):
        values = [d[module] for d in days if d[module] is not None]
        change[module] = round(values[-1] - values[0], 1) if len(values) >= 2 else None
    return {'days': days, 'change': change}
