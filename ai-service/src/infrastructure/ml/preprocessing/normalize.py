import re
import unicodedata


_SPACE_PATTERN = re.compile(r"\s+")
_INVISIBLE_PATTERN = re.compile("[\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]")


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value or "")
    normalized = _INVISIBLE_PATTERN.sub("", normalized)
    normalized = normalized.strip().lower()
    return _SPACE_PATTERN.sub(" ", normalized)
