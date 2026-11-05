"""Deterministic decision function. AI advises, code decides.

The AI judge's output is only a suggestion plus signals. Escalations below can raise a verdict
to at most ASK_HUMAN. Only rules and facts produce BLOCK. The one exception is rule (d): a refusal
of a customer's own request on a soft_refusal_tools tool goes to a human instead of a cold BLOCK.
ASK_HUMAN never executes, so that exception routes the action to a person; it never approves it.
"""
from rules import ORDER
import llm

ASK = "ASK_HUMAN"
SIGNAL_KEYS = ("intent", "sensitivity", "pressure_tactics", "abuse_likelihood", "claims", "summary",
               "aligned", "injection_suspected", "confidence", "latency_ms")
UPSET = ("angry", "distressed")

def _customer_facing(action):
    return isinstance(action.get("customer"), dict) or bool(action.get("customer_message"))

def _template_summary(action):
    """Facts-only summary for when the AI is unavailable."""
    c = action.get("customer") if isinstance(action.get("customer"), dict) else {}
    p = action.get("params") or {}
    bits = [f"Customer {c.get('id', 'unknown')} requested {action.get('tool')}"
            + (f" for {p['amount']}" if "amount" in p else "")]
    if "refunds_7d" in c:
        bits.append(f"{c['refunds_7d']} refunds in the last 7 days")
    bits.append(f"{c.get('refused_attempts', 0)} earlier refused attempts")
    return ", ".join(bits) + "."

def decide(action, rule_result, signals, policy):
    r, j = rule_result, signals
    verdict = r["verdict"] if r else "ALLOW"
    reasons = list(r["reasons"]) if r else []
    sources = {"rules"} if r and verdict != "ALLOW" else set()
    failed = bool(j and j.get("judge_failed"))
    if j:
        reasons.append(("AI judge: " if not failed else "") + j["reason"])

    def escalate(why, source):
        """Raise to ASK_HUMAN at most. Never lowers, never produces BLOCK."""
        nonlocal verdict
        reasons.append(why)
        if ORDER.index(verdict) < ORDER.index(ASK):
            verdict = ASK            # this escalation alone produced ASK_HUMAN
            sources.clear()
            sources.add(source)
        elif verdict == ASK:
            sources.add(source)      # agrees with an existing ASK_HUMAN; a BLOCK stays a rules BLOCK

    cust = action.get("customer") if isinstance(action.get("customer"), dict) else {}
    refused = cust.get("refused_attempts", 0) or 0
    max_refused = policy.get("abuse", {}).get("max_refused_attempts")
    if j and not failed:
        # a) the AI may only ask for a human, never approve or block
        if j["verdict"] in (ASK, "BLOCK"):
            escalate(f"AI judge suggested {j['verdict'].replace('_', ' ')}; the AI can only send this to a human", "llm")
        # b) injection or goal mismatch
        if j.get("injection_suspected"):
            escalate("AI suspects prompt injection in the request", "llm")
        if j.get("aligned") is False:
            escalate("AI judged the action does not match what the user asked for", "llm")
        # c) outgoing message promises something policy forbids
        facts = policy.get("policy_facts", {})
        for k in j.get("claims", []):
            if facts.get(k) is False:
                escalate(f"message promises something policy forbids: {k}", "llm")
    # e) fail closed
    if failed:
        escalate("AI judge unavailable, failing closed to a human", "fail_closed")
    # d) no cold refusals for upset or repeatedly refused customers
    if _customer_facing(action):
        upset = bool(j and not failed and j.get("sensitivity") in UPSET)
        repeat = max_refused is not None and refused >= max_refused
        soft = action.get("tool") in policy.get("soft_refusal_tools", [])
        if verdict == "BLOCK" and soft and (upset or repeat):
            verdict = ASK
            why = (f"customer seems {j['sensitivity']}" if upset else f"customer was already refused {refused} times")
            reasons.append(f"{why}: a human handles this instead of a cold refusal")
            sources.add("rules")
            if upset:
                sources.add("llm")
        elif repeat and verdict != "BLOCK":
            escalate(f"customer was already refused {refused} times", "rules")

    final = verdict
    if final == "ALLOW":
        decided = "none"
    elif "rules" in sources and "llm" in sources:
        decided = "both"
    elif "rules" in sources:
        decided = "rules"
    elif "llm" in sources:
        decided = "llm"
    elif "fail_closed" in sources:
        decided = "fail_closed"
    else:
        decided = "none"

    handoff = None
    if final in (ASK, "BLOCK") and _customer_facing(action):
        sens = j.get("sensitivity") if j and not failed else "unknown"
        queues = policy.get("queues", {})
        handoff = {"queue": queues.get(action.get("tool"), queues.get("default", "support_senior")),
                   "customer_id": cust.get("id"),
                   "intent": j.get("intent") if j and not failed else "unknown",
                   "sensitivity": sens,
                   "refused_attempts": refused,
                   "summary": (j.get("summary") if j and not failed else "") or _template_summary(action),
                   "suggested_tone": "empathetic and calm" if sens in UPSET else "neutral",
                   "reasons": reasons}

    return {"verdict": final, "reasons": reasons,
            "reversible": r["reversible"] if r else None,
            "blast_radius": r["blast_radius"] if r else None,
            "undo_plan": j["undo_plan"] if j else "see policy: reversible tools can be rolled back",
            "rules": r["verdict"] if r else None, "llm": j["verdict"] if j else None,
            "layers": {"rules": {"verdict": r["verdict"], "reasons": r["reasons"]} if r else None,
                       "llm": {"verdict": j["verdict"], "reason": j["reason"], "aligned": j.get("aligned"),
                               "injection_suspected": j.get("injection_suspected")} if j else None},
            "decided_by": decided, "deterministic": decided == "rules",
            "ai_suggestion": j.get("ai_suggestion", j["verdict"]) if j and not failed else None,
            "signals": ({k: j.get(k) for k in SIGNAL_KEYS} | {"judge_failed": failed, "reason": j["reason"], "model": j.get("model") or llm.config()["model"]}) if j else None,
            "handoff": handoff}
