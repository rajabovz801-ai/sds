"""Paid Challenge membership controls profile benefits, independently of mock tickets."""
from datetime import datetime, timezone


def active_pro(membership, at=None):
    try:
        until = datetime.fromisoformat(str(membership.get('challenge_until') or '').replace('Z', '+00:00'))
        return until > (at or datetime.now(timezone.utc))
    except (ValueError, TypeError):
        return False


def visible_style(style, pro):
    return {**style, 'pro': pro, 'photo_url': style.get('photo_url') if pro and style.get('photo_enabled', True) else None}
