# Security

This document records the Phase 9 security audit pass and the
recommended posture for operating GuardianAI in production.

---

## Phase 9 audit pass

**Date:** 2026-04-27
**Scope:** every tracked file in the repository at HEAD, plus the bundled
fixtures under `data/`.
**Reviewer:** Phase 9 polish step.

### What was checked

1. **Hardcoded secrets.** Repo-wide grep for the following high-confidence
   patterns: `sk-[a-zA-Z0-9]{20,}` (OpenAI), `gsk_[a-zA-Z0-9]{20,}`
   (Groq), `ghp_[a-zA-Z0-9]{20,}` (GitHub), `hf_[a-zA-Z0-9]{20,}`
   (HuggingFace), `AKIA[0-9A-Z]{16}` (AWS access keys), and a broader
   sweep for `api_key|secret|password|token` in code and yaml.
2. **PII in fixtures.** Sampled every `data/corpus/*.jsonl` and
   `data/benchmarks/*.jsonl` for real names, phone numbers, addresses,
   emails, Aadhaar / PAN strings.
3. **`.env` files in git.** Confirmed `.env` and `.env.local` are in
   `.gitignore` and absent from `git ls-files`.
4. **`.dockerignore` coverage.** Verified the build context excludes
   `.env`, `data/duckdb/`, `data/chroma/`, and `node_modules/` so
   secrets and per-deployment state can never be baked into an image.
5. **`.env.example` completeness.** Every env var read by backend or
   frontend code (verified by `grep -rn "os.environ\|getenv\|process.env\|VITE_"`)
   is documented in `.env.example`.

### Findings

| Item | Result |
|------|--------|
| Hardcoded LLM / cloud / VCS API keys | None found. |
| Plaintext passwords in code | None. The codebase has no auth layer that takes a password. |
| `.env` committed | Not tracked. `.env` and `.env.local` are gitignored. |
| Secrets baked into Docker images | Build context excludes `.env*` via `.dockerignore`; runtime env vars come from the host shell or compose `environment:` maps. |
| Real PII in `data/corpus/` | None. The corpus is synthesized medical knowledge text covering medication dosing, contraindications, pregnancy, antibiotics, and emergencies. |
| Real PII in `data/benchmarks/` | None. The fixtures use age strata (e.g. "an 80-year-old woman"), drug names, and generic clinical scenarios — no patient-identifying material. |
| Test fixtures with synthetic PII | `data/benchmarks/halueval_fixture.jsonl` and the PII agent test harness include synthetic placeholder identifiers (e.g. fake Aadhaar / PAN strings) used to verify the recognizer fires. These are non-issuing values and clearly synthetic. |

**Verdict: clean.** No remediation required for Phase 9.

### What `_KEY` strings showed up (and why they're fine)

`grep` for `api_key` and `KEY` returns hits in:

- `backend/src/guardian/llm_judge.py` — the variable name `api_key` and
  the literal string `"GROQ_API_KEY"` used as an `os.environ.get(…)` key.
- `backend/src/proxy/upstream.py` — same pattern for the three
  upstream providers.
- `.env.example` — the reference key list with empty values.
- `docker-compose.yml` — `${GROQ_API_KEY:-}` shell-expansion references.

All of these are *names*, not *values*. None of the matches contain a
literal credential.

---

## Secrets management

**Never commit a real key.** GuardianAI assumes secrets are injected
at process boot via environment variables. The contract:

| Layer | Mechanism |
|-------|-----------|
| Local dev | `.env` next to the repo root (loaded by your shell or by `pydantic-settings`). `.env` is gitignored. |
| Docker compose | `${VAR:-}` expansion in `docker-compose.yml` reads from your shell env or a `.env` file at the repo root. |
| Single VM (systemd) | `EnvironmentFile=/etc/guardian/secrets.env` on the unit. Lock the file to `0600 root:root`. |
| Cloud / Kubernetes | Use the platform's secret store (AWS Secrets Manager, GCP Secret Manager, K8s Secret + CSI driver, HashiCorp Vault). Never bake keys into the image. |

**Recommended tools** for production deployments:

- **HashiCorp Vault** — best-in-class for self-hosted with rotation,
  audit, and dynamic credentials.
- **AWS Secrets Manager** / **GCP Secret Manager** — managed, integrates
  with IAM cleanly. Use IAM role attached to the compute layer to read.
- **1Password CLI** (`op run --env-file ./.env.tpl -- uvicorn …`) — the
  cheapest way to keep dev secrets out of plaintext files for a small
  team.
- **doppler / infisical** — SaaS secret-sync that pushes env vars to
  Docker / K8s.

Whichever you pick, the rule is the same: secrets never leave the
boundary of the secret store except as process-environment values
on the running service. Don't echo them. Don't log them. Don't put
them in build args (build args end up in the image history).

### Rotation

Rotate every credential after any of:

1. A team member who had access leaves.
2. A key is suspected leaked (e.g. accidentally pasted into a chat,
   browser, screen share).
3. 90 days have elapsed since the last rotation (default policy).

Groq, Anthropic, OpenAI, HuggingFace all support multiple live keys —
issue the new one, deploy, then revoke the old one to avoid downtime.

---

## Threat model (high level)

| Attack surface | Defense |
|---------------|---------|
| Prompt injection in user input | `PromptInjectionAgent` runs pre-flight; combination of regex rule path + lightweight classifier; on hit the pipeline short-circuits before the LLM is invoked. |
| Data exfiltration via PII leak | `PIIInAgent` redacts user-side PII before retrieval; `PIIOutAgent` re-checks the model's output post-flight; both use Presidio with custom Aadhaar / PAN recognizers. |
| Hostile downstream model | All upstream calls go through `httpx` with explicit timeouts; `BaseAgent` wraps every agent call in a timeout with isolated exceptions so a hung agent can't take down the pipeline. |
| Model weights tampering | First-launch downloads pull from HuggingFace via `transformers` / `sentence-transformers` which verify SHA hashes. `HF_TOKEN` is recommended in production to use authenticated pulls and a stable rate-limit pool. |
| Trace store leak | DuckDB lives at `data/duckdb/traces.db` on the backend filesystem. Mount it as a docker volume; back it up; protect file perms. The schema is in `backend/src/guardian/schemas.py` (`Trace`). |
| Causal Diagnose endpoint enumeration | `GET /api/v1/diagnose/{trace_id}` takes a UUID — no enumeration without the trace id. For a public deployment, gate behind your normal auth layer; the endpoint is read-only. |

---

## Reporting a vulnerability

If you discover a security issue please open a private security advisory
on the GitHub repository (`Security` tab → `Report a vulnerability`)
rather than filing a public issue. The maintainer will respond within
72 hours.

---

## Quick verification commands

Re-run the audit yourself:

```bash
# 1. Repo-wide secret scan (high-confidence patterns)
git grep -i -E '(sk-[a-zA-Z0-9]{20,}|gsk_[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|hf_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16})'

# 2. Broader sweep of code + yaml
git grep -i -E '(api[_-]?key|secret|password|token)' -- '*.py' '*.ts' '*.tsx' '*.yaml' '*.yml' \
  | grep -v -E '(\.venv|node_modules|_KEY"|getenv|os\.environ|process\.env|input_tokens|output_tokens)'

# 3. Confirm .env is not tracked
git ls-files | grep -E '^\.env(\.|$)' || echo 'no .env tracked — OK'

# 4. List every env var the code reads (for .env.example completeness)
grep -rEn 'os\.environ|getenv|process\.env|import\.meta\.env\.VITE_' backend/src frontend/src
```
