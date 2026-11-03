"""Combine rules and LLM. Mode: rules | llm | hybrid.
rules: rules only, strictest rule wins. llm / hybrid: AI advises, decide.py decides (AI can only escalate)."""
from rules import check, load_policy
from judge import judge
from decide import decide
import audit

POLICY = load_policy()

def decided_by(final, r, j):
    """Which layer produced the final verdict. A failed judge never counts as a real AI decision."""
    if final == "ALLOW":
        return "none"
    failed = bool(j and j.get("judge_failed"))
    rules_hit = bool(r and r["verdict"] == final)
    llm_hit = bool(j and j["verdict"] == final and not failed)
    if rules_hit and llm_hit:
        return "both"
    if rules_hit:
        return "rules"
    if llm_hit:
        return "llm"
    return "fail_closed" if failed else "none"

def evaluate(action, mode="hybrid", log=True):
    r = check(action, POLICY) if mode in ("rules", "hybrid") else None
    j = judge(action, fact_keys=list(POLICY.get("policy_facts", {}))) if mode in ("llm", "hybrid") else None
    if mode == "rules":
        final = r["verdict"]
        out = {"id": action.get("id"), "mode": mode, "verdict": final, "reasons": r["reasons"],
               "reversible": r["reversible"], "blast_radius": r["blast_radius"],
               "undo_plan": "see policy: reversible tools can be rolled back",
               "rules": final, "llm": None,
               "layers": {"rules": {"verdict": final, "reasons": r["reasons"]}, "llm": None},
               "decided_by": decided_by(final, r, None), "deterministic": decided_by(final, r, None) == "rules",
               "ai_suggestion": None, "signals": None, "handoff": None}
    else:
        out = {"id": action.get("id"), "mode": mode, **decide(action, r, j, POLICY)}
    if log:
        audit.append({"action": action, "result": out})
    return out
