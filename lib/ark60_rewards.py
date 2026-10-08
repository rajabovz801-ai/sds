"""Daily reward catalog; progress counts claims, never resets unlocked cosmetics."""
THEMES = ('dawn', 'ocean', 'forest')
AVATARS = ('boy', 'girl', 'girl-hijab')
BADGE_DAYS = (10, 14, 21, 28, 35, 42, 49, 56, 60)

def reward_for_day(day):
    day = max(1, min(60, int(day)))
    if day == 8:
        kind, amount, label = 'theme', 0, 'Theme collection'
    elif day == 11:
        kind, amount, label = 'decoration', 0, 'Matching decorations'
    elif day == 13:
        kind, amount, label = 'avatar', 0, 'Avatar collection'
    elif day in BADGE_DAYS:
        kind, amount, label = 'badge', 0, 'Study badge' if day == 10 else str(day) + '-day badge'
    else:
        kind, amount = 'coins', day if day <= 7 else (5 if day % 2 == 0 else 3)
        label = '+' + str(amount) + ' coins'
    return {'day': day, 'kind': kind, 'amount': amount, 'label': label}

def unlocks(claimed_days):
    count = max(0, int(claimed_days))
    return {'themes': list(THEMES) if count >= 8 else [],
            'avatars': list(AVATARS) if count >= 13 else [],
            'decorations': count >= 11,
            'badges': ['day-' + str(n) for n in BADGE_DAYS if count >= n]}

def style_allowed(claimed_days, theme, avatar):
    owned = unlocks(claimed_days)
    return (theme is None or theme in owned['themes']) and (avatar is None or avatar in owned['avatars'])
