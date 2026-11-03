import json, streamlit as st
import audit
from prahari import evaluate
from benchmark import run, CASES

st.set_page_config(page_title="Prahari", layout="wide")
st.title("Prahari: checkpoint for AI agent actions")
COLORS = {"ALLOW": "green", "ALLOW_WITH_LIMITS": "orange", "ASK_HUMAN": "orange", "BLOCK": "red"}

left, right = st.columns(2)
with left:
    pick = st.selectbox("Load a test case", [c["id"] + "  " + c["action"]["tool"] for c in CASES])
    case = next(c for c in CASES if pick.startswith(c["id"]))
    text = st.text_area("Agent action (JSON)", json.dumps(case["action"], indent=2), height=280)
    mode = st.radio("Mode", ["hybrid", "rules", "llm"], horizontal=True)
    go = st.button("Check this action", type="primary")
with right:
    res = None
    if go:
        try:
            res = evaluate(dict(json.loads(text), id=case["id"]), mode=mode)
        except json.JSONDecodeError as e:
            st.error(f"Invalid JSON: {e}")
        except (KeyError, TypeError, ValueError) as e:
            st.error(f"Action is missing a field or has a bad value: {e!r}")
    if res:
        st.markdown(f"## :{COLORS[res['verdict']]}[{res['verdict']}]")
        st.write("**Why:**")
        for r in res["reasons"]:
            st.write("- " + r)
        st.write("**Undo plan:**", res["undo_plan"])
        st.caption(f"reversible: {res['reversible']}   blast radius: {res['blast_radius']}   rules: {res['rules']}   llm: {res['llm']}")

st.divider()
if st.button("Run benchmark on all 20 cases"):
    st.table([run(m) for m in ("rules", "llm", "hybrid")])
ok, bad = audit.verify()
st.write("**Audit log**", "chain intact" if ok else f"TAMPERED at row {bad}")
def _row(r):
    b = r["body"]   # server.py also logs "swap" and "human_decision" rows, which have no action/result
    kind = next((k for k in ("swap", "human_decision", "session_terminated") if k in b), None)
    return {"time": b.get("ts"), "tool": b.get("action", {}).get("tool", kind or "?"),
            "verdict": b.get("result", {}).get("verdict", "-"), "hash": r["hash"][:12]}
st.dataframe([_row(r) for r in audit.read()[::-1]])
