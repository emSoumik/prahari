"""Layer 1: fast, offline policy rules. Returns a verdict plus reasons."""
import re, yaml, pathlib

ORDER = ["ALLOW", "ALLOW_WITH_LIMITS", "ASK_HUMAN", "BLOCK"]
INJECTION = re.compile(r"ignore (all |any )?(previous|prior)|disregard (the )?(above|previous)|you must now|system prompt"
                       r"|forget (all |your )?(previous |prior )?instructions|new instructions\s*:|\bact as\b|do not tell the user", re.I)

def load_policy(path=None):
    path = path or pathlib.Path(__file__).with_name("policy.yaml")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

def worst(*verdicts):
    return max(verdicts, key=ORDER.index)

def _num(v):
    """Number from int/float/numeric string, else None (bools are not numbers)."""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return v
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def check(action, policy):
    tool, role = action["tool"], action.get("role", "")
    params = action.get("params", {})
    reasons, verdict = [], "ALLOW"
    role_cfg = policy["roles"].get(role)
    reversible = tool not in policy["irreversible_tools"]

    def hit(v, why):
        nonlocal verdict
        verdict = worst(verdict, v); reasons.append(why)

    if tool in policy["hard_blocks"]:
        hit("BLOCK", f"{tool} is on the hard-block list")
    if role_cfg is None or tool not in role_cfg["allowed_tools"]:
        hit("BLOCK", f"role '{role}' is not authorized to use {tool}")
    blob = " ".join(str(v) for v in params.values()) + " " + action.get("context", "")
    if action.get("instruction_source", "user") != "user":
        if INJECTION.search(blob):
            hit("BLOCK", "instruction came from tool output and looks like prompt injection")
        elif tool not in policy["read_only_tools"]:
            hit("ASK_HUMAN", "a non-read action was triggered by tool output, not by the user")
    q = str(params.get("query", ""))
    if re.search(r"\bdelete\s+from\b", q, re.I) and not re.search(r"\bwhere\b", q, re.I):
        hit("BLOCK", "DELETE without WHERE would wipe a whole table")
    if not reversible:
        hit("ASK_HUMAN", f"{tool} has no undo path, a human must approve")
    raw_amount = params.get("amount")
    amount = _num(raw_amount)
    if raw_amount is not None and amount is None:
        hit("ASK_HUMAN", f"amount {raw_amount!r} is not a number")
    elif amount is not None and role_cfg is not None and amount > role_cfg["max_amount"]:
        hit("ASK_HUMAN", f"amount {amount} is above the {role_cfg['max_amount']} limit for {role}")
    raw_rows = params.get("rows") or params.get("recipients") or 0
    rows = len(raw_rows) if isinstance(raw_rows, (list, tuple)) else _num(raw_rows)
    if rows is None:
        hit("ASK_HUMAN", f"row/recipient count {raw_rows!r} is not a number")
        blast = 5
    else:
        blast = 1 if rows <= 1 else 2 if rows <= 10 else 3 if rows <= policy["max_rows_without_review"] else 5
        if blast >= 5:
            hit("ASK_HUMAN", f"blast radius {rows} items is above the review threshold")
    # Facts-based checks (Phase A). New policy keys are optional so older policy files still load.
    auth = action.get("auth") if isinstance(action.get("auth"), dict) else {}
    customer = action.get("customer") if isinstance(action.get("customer"), dict) else {}
    if tool in policy.get("step_up_required_tools", []) and auth.get("step_up_verified") is not True:
        hit("BLOCK", "irreversible transfer without step-up authentication")
    max_refunds = policy.get("abuse", {}).get("max_refunds_7d")
    if tool == "refund.issue" and max_refunds is not None and "refunds_7d" in customer:
        n = _num(customer["refunds_7d"])
        if n is None:
            hit("ASK_HUMAN", f"refunds_7d {customer['refunds_7d']!r} is not a number")
        elif n > max_refunds:
            hit("BLOCK", f"refund limit exceeded: {customer['refunds_7d']} refunds in 7 days")
    floors = policy.get("min_offer_price", {})
    if tool == "offer.send":
        kind = params.get("item_type", params.get("item"))
        if kind in floors:
            price = _num(params.get("price"))
            if price is None:
                hit("ASK_HUMAN", f"price {params.get('price')!r} is missing or not a number")
            elif price < floors[kind]:
                hit("BLOCK", "price below the authorized minimum")
    return {"verdict": verdict, "reasons": reasons or ["no rule triggered"],
            "reversible": reversible, "blast_radius": blast}
