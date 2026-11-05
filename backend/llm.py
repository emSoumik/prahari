"""The only module that talks to a model. Any OpenAI-compatible /chat/completions endpoint works.

Config comes from per-request headers (set by `from_headers`) over env vars OPENAI_API_KEY,
OPENAI_BASE_URL and OPENAI_MODEL. The key is never returned, printed or logged.
"""
import os, time, pathlib
from contextvars import ContextVar
from urllib.parse import urlparse
import requests
from fastapi import Request


def _load_env(path=pathlib.Path(__file__).with_name(".env")):
    """Load KEY=value lines from a git-ignored .env file. Real env vars win."""
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            k, sep, v = line.partition("=")
            if sep and k.strip() and not k.lstrip().startswith("#"):
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

_load_env()

DEFAULT_BASE = "https://api.openai.com/v1"
DEFAULT_MODEL = "gpt-4.1-mini"
LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "host.docker.internal"}
_HEADER_FIELDS = (("X-LLM-Key", "api_key"), ("X-LLM-Base-URL", "base_url"), ("X-LLM-Model", "model"))

_overrides: ContextVar[dict] = ContextVar("llm_overrides", default={})


class LLMNotConfigured(RuntimeError):
    pass


async def from_headers(request: Request):
    """App-wide FastAPI dependency: copy the X-LLM-* headers into the ContextVar."""
    found = {}
    for header, field in _HEADER_FIELDS:
        v = (request.headers.get(header) or "").strip()
        if v:
            found[field] = v
    _overrides.set(found)


def config():
    ov = _overrides.get()
    return {
        "api_key": ov.get("api_key") or os.getenv("OPENAI_API_KEY", "").strip(),
        "base_url": (ov.get("base_url") or os.getenv("OPENAI_BASE_URL", "").strip() or DEFAULT_BASE).rstrip("/"),
        "model": ov.get("model") or os.getenv("OPENAI_MODEL", "").strip() or DEFAULT_MODEL,
    }


def _host(base_url):
    try:
        return urlparse(base_url).hostname or ""
    except ValueError:
        return ""


def _check(cfg):
    """Raise LLMNotConfigured unless the config can be used for a call."""
    try:
        p = urlparse(cfg["base_url"])
        host = p.hostname
    except ValueError:
        raise LLMNotConfigured("invalid base URL")
    if p.scheme not in ("http", "https") or not host:
        raise LLMNotConfigured("base URL must be http or https")
    if not cfg["api_key"] and host not in LOCAL_HOSTS:
        raise LLMNotConfigured("no API key set")


def configured():
    try:
        _check(config())
        return True
    except LLMNotConfigured:
        return False


def public_info():
    ov = _overrides.get()
    cfg = config()
    return {"configured": configured(),
            "source": "header" if ov else "env" if configured() else "none",
            "model": cfg["model"], "base_host": _host(cfg["base_url"])}


def _extract(resp_json):
    ch = resp_json["choices"][0]
    for path in (("message", "content"), ("delta", "content")):
        try:
            return ch[path[0]][path[1]] or ""
        except (KeyError, TypeError):
            pass
    return ch.get("text", "")


def _headers(cfg):
    return {"Authorization": f"Bearer {cfg['api_key']}"} if cfg["api_key"] else {}


def _role(r):
    r = str(r).strip().lower()
    return r if r in ("system", "user", "assistant") else "user"


def complete(messages, *, max_tokens=400, temperature=0, timeout=20):
    """One chat completion. Returns (text, model). Raises LLMNotConfigured or a requests error."""
    cfg = config()
    _check(cfg)
    body = {"model": cfg["model"], "stream": False, "temperature": temperature, "max_tokens": max_tokens,
            "messages": [{"role": _role(m["role"]), "content": m["content"]} for m in messages]}
    r = requests.post(f"{cfg['base_url']}/chat/completions", json=body, timeout=timeout, headers=_headers(cfg))
    r.raise_for_status()
    return _extract(r.json()), cfg["model"]


def list_models(timeout=10):
    cfg = config()
    _check(cfg)
    r = requests.get(f"{cfg['base_url']}/models", timeout=timeout, headers=_headers(cfg))
    r.raise_for_status()
    data = r.json()
    items = data.get("data", data.get("models", [])) if isinstance(data, dict) else data
    ids = {(m.get("id") or m.get("name")) if isinstance(m, dict) else m for m in items}
    return sorted(str(i) for i in ids if i)[:200]


def test():
    t0 = time.perf_counter()
    _, model = complete([{"role": "system", "content": "Reply with the single word: ok"},
                         {"role": "user", "content": "ok"}], max_tokens=5)
    return {"ok": True, "model": model, "latency_ms": round((time.perf_counter() - t0) * 1000)}


def friendly_error(exc):
    host = _host(config()["base_url"]) or "the provider"
    if isinstance(exc, LLMNotConfigured):
        return "No model configured. Add an API key in Settings or OPENAI_API_KEY in backend/.env"
    if isinstance(exc, requests.HTTPError) and exc.response is not None:
        code = exc.response.status_code
        if code in (401, 403):
            return "The provider rejected the key"
        if code == 404:
            return f"Model or endpoint not found at {host}"
        if code == 429:
            return "Rate limited by the provider"
        return f"The provider returned HTTP {code}"
    if isinstance(exc, requests.Timeout):
        return "The model took too long to answer"
    if isinstance(exc, requests.ConnectionError):
        return f"Could not reach {host}"
    return f"The model call failed ({type(exc).__name__})"
