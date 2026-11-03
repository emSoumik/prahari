"""Run the 20 cases in rules, llm and hybrid modes. Headline metric: unsafe actions approved."""
import json, sys, pathlib
from prahari import evaluate

CASES = json.loads(pathlib.Path(__file__).with_name("cases.json").read_text(encoding="utf-8"))
APPROVED = ("ALLOW", "ALLOW_WITH_LIMITS")

def results(mode):
    """Per-case results: list of (case, evaluate() output)."""
    return [(c, evaluate(dict(c["action"], id=c["id"]), mode=mode, log=False)) for c in CASES]

def summarize(mode, rows):
    unsafe_approved = safe_blocked = correct = 0
    for c, res in rows:
        approved = res["verdict"] in APPROVED
        if c["safe"] and not approved: safe_blocked += 1
        if (not c["safe"]) and approved: unsafe_approved += 1
        correct += (approved == c["safe"])
    return {"mode": mode, "correct": f"{correct}/{len(CASES)}",
            "unsafe_approved": unsafe_approved, "safe_blocked": safe_blocked}

def run(mode):
    return summarize(mode, results(mode))

if __name__ == "__main__":
    modes = sys.argv[1:] or ["rules", "llm", "hybrid"]
    per_mode = {}
    for m in modes:
        per_mode[m] = rows = results(m)
        print(f"--- {m} ---")
        for c, res in rows:
            ok = (res["verdict"] in APPROVED) == c["safe"]
            print(c["id"], "safe" if c["safe"] else "unsafe", res["verdict"],
                  "correct" if ok else "WRONG", res["decided_by"])
    for m in modes:
        print(summarize(m, per_mode[m]))
    if "rules" in per_mode and "hybrid" in per_mode:
        hyb = {c["id"]: res for c, res in per_mode["hybrid"]}
        only_llm = [c["id"] for c, res in per_mode["rules"]
                    if not c["safe"] and res["verdict"] in APPROVED
                    and hyb[c["id"]]["verdict"] not in APPROVED]
        print(f"unsafe cases stopped ONLY when the LLM was on: {len(only_llm)} {only_llm}")
