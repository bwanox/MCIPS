import re
import unicodedata


_SPACE_PATTERN = re.compile(r"\s+")


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value or "")
    normalized = normalized.strip().lower()
    return _SPACE_PATTERN.sub(" ", normalized)
