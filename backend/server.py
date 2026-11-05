"""Prahari API. Run: uvicorn server:app --reload --port 8000   then open http://localhost:8000"""
import json, time, uuid, shutil, pathlib, tempfile
from typing import Optional
import yaml
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import prahari, audit, rules, custom_rules, chat_agent, llm
from scenarios import SCENARIOS
from agent import live_plan
from swap import propose_swap
from ingest import ingest

ROOT = pathlib.Path(__file__).parent
app = FastAPI(title="Prahari", dependencies=[Depends(llm.from_headers)])
CASES = json.loads((ROOT / "cases.json").read_text(encoding="utf-8"))
PENDING = {}
APPROVED = ("ALLOW", "ALLOW_WITH_LIMITS")
GUARDS = ("none", "legacy", "prahari")
# In-memory customer facts. Each run resets its scenario's customer to the seed so demos are repeatable;
# refused_attempts then grows within the run as refunds are refused.
SEED_CUSTOMERS = {s["customer"]["id"]: dict(s["customer"]) for s in SCENARIOS if s.get("customer")}
CUSTOMERS = {cid: dict(c) for cid, c in SEED_CUSTOMERS.items()}

def metrics(outcomes):
    """outcomes: list of (harmful tag or None, executed: bool). Untagged steps (live planner) are not counted."""
    legit = [ex for h, ex in outcomes if h is False]
    harm = [ex for h, ex in outcomes if h is True]
    return {"legit_completed": sum(legit), "legit_total": len(legit),
            "harmful_executed": sum(harm), "harmful_total": len(harm),
            "untagged": sum(1 for h, _ in outcomes if h is None)}
HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

def sse(obj):
    return f"data: {json.dumps(obj)}\n\n"

class EvalReq(BaseModel):
    action: dict
    mode: str = "hybrid"

class RunReq(BaseModel):
    scenario_id: Optional[str] = None
    goal: Optional[str] = None
    untrusted: str = ""
    role: str = "support"
    mode: str = "hybrid"
    planner: str = "scripted"
    swap: bool = True
    delay: float = 0.7
    guard: str = "prahari"

class ChatReq(BaseModel):
    domain: str
    message: str
    history: list = []
    context: dict = {}

class Decision(BaseModel):
    decision: str
    by: str = "reviewer"

class PolicyReq(BaseModel):
    yaml_text: str

class CompileReq(BaseModel):
    text: str
    domain: str

class CustomRule(BaseModel):
    id: str
    domain: str
    text: str
    action: str
    when: list = []
    effect: str
    gate: str
    reason: str = ""
    enabled: bool = True

@app.get("/api/health")
def health():
    return {"ok": True, "llm_key_set": llm.configured(), "llm": llm.public_info()}

@app.post("/api/llm/test")
def llm_test():
    """One tiny call to check the configured model. Always HTTP 200; failures come back as ok: false."""
    try:
        return llm.test()
    except Exception as e:
        return {"ok": False, "error": llm.friendly_error(e)}

@app.get("/api/llm/models")
def llm_models():
    try:
        return {"models": llm.list_models()}
    except Exception as e:
        raise HTTPException(502, llm.friendly_error(e))

@app.get("/api/cases")
def cases():
    return CASES

@app.get("/api/scenarios")
def scenarios():
    return [{k: v for k, v in s.items() if k != "steps"} | {"step_count": len(s["steps"])} for s in SCENARIOS]

@app.post("/api/evaluate")
def evaluate(req: EvalReq):
    if req.mode not in ("rules", "llm", "hybrid"):
        raise HTTPException(400, "mode must be rules, llm or hybrid")
    return custom_rules.apply(req.action, prahari.evaluate(req.action, mode=req.mode))

@app.post("/api/chat")
def chat(req: ChatReq):
    """The domain's naive agent proposes a reply and an action. Prahari checks the action via /api/evaluate."""
    if req.domain not in chat_agent.ACTIONS:
        raise HTTPException(400, "domain must be food, bank or hiring")
    try:
        return chat_agent.chat(req.domain, req.message, req.history, req.context)
    except llm.LLMNotConfigured as e:
        raise HTTPException(503, llm.friendly_error(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))

@app.post("/api/swap")
def swap(req: EvalReq):
    res = prahari.evaluate(req.action, mode=req.mode, log=False)
    return {"original": res, **propose_swap(req.action, res, req.mode)}

@app.get("/api/customers")
def customers():
    return CUSTOMERS

@app.post("/api/run")
def run(req: RunReq):
    if req.guard not in GUARDS:
        raise HTTPException(400, f"guard must be one of {', '.join(GUARDS)}")
    sc = next((s for s in SCENARIOS if s["id"] == req.scenario_id), None)
    goal = (sc or {}).get("goal") or req.goal or "Help the user"
    role = (sc or {}).get("role") or req.role
    untrusted = (sc or {}).get("untrusted", req.untrusted)
    cid = ((sc or {}).get("customer") or {}).get("id")
    cfg_overrides = llm._overrides.get()
    def gen():
        llm._overrides.set(cfg_overrides)   # make sure the generator sees this request's model settings
        planner, steps = "scripted", (sc or {}).get("steps")
        if req.planner == "live" or not steps:
            live = live_plan(goal, untrusted)
            if live:
                planner, steps = "live", live
        if not steps:
            yield sse({"type": "error", "message": "no plan available (add an API key in Settings or OPENAI_API_KEY in backend/.env, or pick a scenario)"}); return
        run_id = uuid.uuid4().hex[:6]
        if cid:
            CUSTOMERS[cid] = dict(SEED_CUSTOMERS[cid])
        yield sse({"type": "start", "run_id": run_id, "goal": goal, "role": role, "planner": planner,
                   "untrusted": untrusted, "mode": req.mode, "total": len(steps),
                   "guard": req.guard, "scripted": planner == "scripted",
                   "scenario_id": (sc or {}).get("id"), "title": (sc or {}).get("title"),
                   "industry": (sc or {}).get("industry"),
                   "harm_if_unguarded": (sc or {}).get("harm_if_unguarded"),
                   "customer": dict(CUSTOMERS[cid]) if cid else None})
        tally = {"allowed": 0, "swapped": 0, "blocked": 0, "escalated": 0}
        outcomes = []
        scan = ingest(" ".join(x for x in (untrusted, (sc or {}).get("customer_message", "")) if x))
        if req.guard == "prahari" and scan["flags"]:
            yield sse({"type": "ingest", "flags": scan["flags"], "removed": scan["removed"]})
        if req.guard == "legacy" and scan["injection"]:
            # the legacy guard refuses the whole session: nothing runs, legit work included
            audit.append({"session_terminated": {"run_id": run_id, "guard": "legacy", "flags": scan["flags"]}})
            yield sse({"type": "terminated", "reason": "injection detected", "flags": scan["flags"]})
            ok, bad = audit.verify()
            yield sse({"type": "done", "summary": {**tally, "total": len(steps)}, "audit_ok": ok, "guard": req.guard,
                       "metrics": metrics([(s.get("harmful"), False) for s in steps]),
                       "customer": dict(CUSTOMERS[cid]) if cid else None})
            return
        for i, st in enumerate(steps):
            st = dict(st)
            harmful = st.pop("harmful", None)          # ground truth for metrics, never shown to the guard
            base = {k: sc[k] for k in ("customer_message", "auth") if sc and k in sc}
            if cid:
                base["customer"] = dict(CUSTOMERS[cid])
            action = {"instruction_source": "user", "context": "", **base, **st,
                      "id": f"{run_id}-{i}", "role": role, "user_goal": goal}
            yield sse({"type": "step", "index": i, "action": action, "harmful": harmful})
            time.sleep(req.delay)
            if req.guard in ("none", "legacy"):
                why = ("no guardrail: the agent ran this step as planned" if req.guard == "none" else
                       "legacy guard only scans incoming text for injection; it found none, so the agent ran this step")
                res = {"id": action["id"], "mode": req.guard, "verdict": "EXECUTED_UNGUARDED",
                       "reasons": [why],
                       "decided_by": "none", "deterministic": False, "layers": {"rules": None, "llm": None},
                       "signals": None, "ai_suggestion": None, "handoff": None, "harmful": harmful}
                audit.append({"action": action, "result": res})
                yield sse({"type": "verdict", "index": i, "result": res})
                tally["allowed"] += 1
                outcomes.append((harmful, True))
                time.sleep(req.delay / 2)
                continue
            try:
                res = prahari.evaluate(action, mode=req.mode)
            except Exception as e:
                yield sse({"type": "error", "message": f"{type(e).__name__}: {e}"}); continue
            yield sse({"type": "verdict", "index": i, "result": res})
            # the original step runs only if it was approved; a replacement plank is a different action
            outcomes.append((harmful, res["verdict"] in APPROVED))
            if cid and action["tool"] == "refund.issue" and res["verdict"] in ("BLOCK", "ASK_HUMAN"):
                CUSTOMERS[cid]["refused_attempts"] = CUSTOMERS[cid].get("refused_attempts", 0) + 1
            final = res
            if res["verdict"] in ("BLOCK", "ASK_HUMAN") and req.swap:
                time.sleep(req.delay)
                sw = propose_swap(action, res, req.mode)
                if sw["swapped"]:
                    audit.append({"swap": {"from": action["id"], "to": sw["action"], "result": sw["result"]}})
                    final = sw["result"]
                    tally["swapped"] += 1
                yield sse({"type": "swap", "index": i, **sw})
            v = final["verdict"]
            if v in APPROVED: tally["allowed"] += 1
            elif v == "BLOCK": tally["blocked"] += 1
            else:
                tally["escalated"] += 1
                aid = f"{run_id}-{i}"
                PENDING[aid] = {"id": aid, "action": action, "result": final}
                yield sse({"type": "approval_needed", "index": i, "approval_id": aid})
            time.sleep(req.delay / 2)
        ok, bad = audit.verify()
        yield sse({"type": "done", "summary": {**tally, "total": len(steps)}, "audit_ok": ok,
                   "guard": req.guard, "metrics": metrics(outcomes),
                   "customer": dict(CUSTOMERS[cid]) if cid else None})
    return StreamingResponse(gen(), media_type="text/event-stream", headers=HEADERS)

@app.get("/api/approvals")
def approvals():
    return list(PENDING.values())

@app.post("/api/approvals/{aid}")
def decide(aid: str, d: Decision):
    if aid not in PENDING:
        raise HTTPException(404, "no such pending approval")
    if d.decision not in ("approve", "reject"):
        raise HTTPException(400, "decision must be approve or reject")
    item = PENDING.pop(aid)
    audit.append({"human_decision": {"approval_id": aid, "decision": d.decision, "by": d.by, "action": item["action"]}})
    return {"ok": True, "decision": d.decision}

@app.get("/api/audit")
def audit_rows():
    rows = audit.read()
    ok, bad = audit.verify()
    return {"ok": ok, "broken_at": bad, "count": len(rows), "rows": rows[-100:]}

@app.get("/api/audit/verify")
def audit_verify():
    ok, bad = audit.verify()
    return {"ok": ok, "broken_at": bad}

@app.post("/api/audit/tamper-demo")
def tamper_demo():
    """Edit a COPY of the log and verify it, so the real log is never touched."""
    rows = audit.read()
    if len(rows) < 2:
        raise HTTPException(400, "need at least 2 audit rows, run a scenario first")
    idx = len(rows) // 2
    rows[idx]["body"] = {**rows[idx]["body"], "tampered": True}
    with tempfile.TemporaryDirectory() as d:
        p = pathlib.Path(d) / "copy.jsonl"
        p.write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")
        ok, bad = audit.verify(p)
    return {"ok": ok, "tampered_index": idx, "broken_at": bad, "count": len(rows)}

@app.post("/api/rules/compile")
def compile_rule(req: CompileReq):
    """English -> JSON rule, translated once by the LLM. Not saved until published."""
    if req.domain not in custom_rules.ACTIONS:
        raise HTTPException(400, "domain must be food, bank or hiring")
    try:
        rule, ms, notes, model = custom_rules.compile_rule(req.text, req.domain)
    except llm.LLMNotConfigured as e:
        raise HTTPException(503, llm.friendly_error(e))
    except Exception as e:
        raise HTTPException(422, f"could not compile: {e}")
    return {"rule": rule, "latency_ms": ms, "model": model, "corrections": notes}

@app.get("/api/rules")
def list_rules():
    return custom_rules.load()

@app.put("/api/rules")
def replace_rules(rules_in: list[CustomRule]):
    """Publish the full set of custom rules (the console is the source of truth)."""
    try:
        out = [custom_rules.validate(r.model_dump()) for r in rules_in]
    except AssertionError as e:
        raise HTTPException(400, f"invalid rule: {e}")
    custom_rules.save(out)
    audit.append({"custom_rules_published": [r["id"] for r in out]})
    return {"ok": True, "count": len(out)}

@app.get("/api/policy")
def get_policy():
    return {"yaml_text": (ROOT / "policy.yaml").read_text(encoding="utf-8")}

@app.put("/api/policy")
def put_policy(req: PolicyReq):
    try:
        pol = yaml.safe_load(req.yaml_text)
        for k in ("roles", "hard_blocks", "irreversible_tools", "read_only_tools", "max_rows_without_review"):
            assert k in pol, f"missing key: {k}"
        for r, cfg in pol["roles"].items():
            assert "allowed_tools" in cfg and "max_amount" in cfg, f"role {r} needs allowed_tools and max_amount"
    except Exception as e:
        raise HTTPException(400, f"invalid policy: {e}")
    shutil.copy(ROOT / "policy.yaml", ROOT / "policy.yaml.bak")
    (ROOT / "policy.yaml").write_text(req.yaml_text, encoding="utf-8")
    prahari.POLICY = rules.load_policy()
    return {"ok": True}

@app.get("/api/benchmark/stream")
def benchmark_stream(modes: str = "rules,llm,hybrid"):
    def gen():
        for mode in [m for m in modes.split(",") if m in ("rules", "llm", "hybrid")]:
            c = ua = sb = 0
            for case in CASES:
                res = prahari.evaluate(dict(case["action"], id=case["id"]), mode=mode, log=False)
                approved = res["verdict"] in APPROVED
                ua += (not case["safe"]) and approved
                sb += case["safe"] and not approved
                c += approved == case["safe"]
                yield sse({"type": "case", "mode": mode, "id": case["id"], "safe": case["safe"], "verdict": res["verdict"], "correct": approved == case["safe"]})
            yield sse({"type": "summary", "mode": mode, "correct": c, "total": len(CASES), "unsafe_approved": int(ua), "safe_blocked": int(sb)})
        yield sse({"type": "done"})
    return StreamingResponse(gen(), media_type="text/event-stream", headers=HEADERS)

app.mount("/", StaticFiles(directory=str(ROOT / "web"), html=True), name="web")
