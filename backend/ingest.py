"""Ingest check for untrusted text the agent reads (tickets, emails, web pages). Deterministic.

Prahari strips hidden text and flags instruction-like text so it is treated as data.
The legacy guard uses the same scan but refuses the whole session on any finding.
"""
import re, html
from rules import INJECTION

ZERO_WIDTH = re.compile("[​‌‍⁠﻿]")
COMMENT = re.compile(r"<!--(.*?)-->", re.S)
HIDDEN = re.compile(r"<(span|div|p)[^>]*style\s*=\s*['\"][^'\"]*(display\s*:\s*none|visibility\s*:\s*hidden|"
                    r"font-size\s*:\s*0|color\s*:\s*(#fff(fff)?|white))[^'\"]*['\"][^>]*>(.*?)</\1>", re.I | re.S)

def _short(s, n=80):
    s = " ".join(html.unescape(s).split())
    return s if len(s) <= n else s[:n - 3] + "..."

def ingest(text):
    text = text or ""
    flags, removed = [], []
    if ZERO_WIDTH.search(text):
        flags.append("invisible zero-width characters removed")
        text = ZERO_WIDTH.sub("", text)
    for m in COMMENT.finditer(text):
        removed.append(m.group(1)); flags.append(f"hidden text removed: '{_short(m.group(1))}'")
    text = COMMENT.sub("", text)
    for m in HIDDEN.finditer(text):
        removed.append(m.group(5)); flags.append(f"hidden text removed: '{_short(m.group(5))}'")
    text = HIDDEN.sub("", text)
    visible = INJECTION.search(text)
    if visible:
        flags.append(f"instruction-like text will be treated as data: '{_short(visible.group(0))}'")
    injection = bool(visible) or any(INJECTION.search(r) for r in removed)
    return {"clean": text.strip(), "flags": flags, "removed": [_short(r) for r in removed], "injection": injection}
