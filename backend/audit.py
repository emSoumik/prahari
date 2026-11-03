"""Tamper-evident audit log: every row stores the hash of the previous row."""
import json, hashlib, pathlib, time

LOG = pathlib.Path(__file__).with_name("audit.jsonl")

def _hash(prev, body):
    return hashlib.sha256((prev + json.dumps(body, sort_keys=True)).encode()).hexdigest()

def append(entry, path=LOG):
    rows = read(path)
    prev = rows[-1]["hash"] if rows else "GENESIS"
    body = {"ts": time.strftime("%Y-%m-%d %H:%M:%S"), **entry}
    row = {"prev": prev, "body": body, "hash": _hash(prev, body)}
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")
    return row

def read(path=LOG):
    p = pathlib.Path(path)
    if not p.exists():
        return []
    return [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]

def verify(path=LOG):
    prev = "GENESIS"
    for i, row in enumerate(read(path)):
        if row["prev"] != prev or row["hash"] != _hash(prev, row["body"]):
            return False, i
        prev = row["hash"]
    return True, None
