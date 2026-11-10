## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Minimal Code
- Write the shortest solution that fully meets the stated requirement. YAGNI: no features, options, or config not asked for.
- Browser APIs and existing dependencies first. Add an npm package only when they would take substantially more code or be less reliable, and say why in one line.
- No new classes, abstraction layers, factories, or helper modules unless the same logic is needed in 3+ places.
- No speculative error handling for situations that can't realistically happen. Let unexpected errors throw.
- Edit existing code in place with minimal diffs. Don't refactor, rename, or reformat code outside the task.
- No boilerplate comments that restate the code. Comment only non-obvious "why".
- Don't generate tests, READMEs, or example files unless asked.
- Keep explanations short: what changed and why.

## Evidence Handling: never minimize
This is forensic tooling. If minimal code conflicts with defensibility in court, defensibility wins.
- SHA-256 is the primary hash. Verify before and after any read, copy, or transform of evidence.
- MD5 is kept only for matching legacy acquisition records. Don't remove it, and don't add MD5 or SHA-1 anywhere else.
- Never modify source evidence files.
- Chain-of-custody logging: timestamps, tool version, operator, input/output hashes.
- Validate evidence input and fail explicitly. Never silently skip or swallow errors on evidence data.
- Output must be deterministic and reproducible.
- No real case data in this repo. Samples and tests use synthetic data only.

## Streamlit GUI pattern (reusable on other repos)
Reference implementation: `gui/app.py`. Use this shape when adding a local GUI to forensic tooling.
- Thin layer: one `gui/app.py`, stdlib plus Streamlit (pinned in `gui/requirements.txt`). Never modify core modules. If the core is not Python, read the tool's exported output instead of re-implementing its logic.
- Local only: `.streamlit/config.toml` with `server.address = "localhost"`, `server.headless = true`, `browser.gatherUsageStats = false`, `client.toolbarMode = "minimal"`. No network calls.
- Read-only input: open evidence `rb` only. SHA-256 before parsing and again after; show both; a difference is a hard stop.
- Fail closed: validate, then render. On any load error (`OSError`, `ValueError`, `KeyError`, `TypeError`, `AttributeError`, `IndexError`) show `st.error`, write the audit entry, `st.stop()`. No partial display.
- Honest wording: say "internally consistent", not "verified authentic". Offer an optional expected-hash input for comparison against an independent record; mismatch is a hard stop.
- Untrusted text: never pass evidence-derived strings to `st.markdown`, `st.write`, `st.caption`, `st.json`, or alert bodies. Use `st.text`, `st.code`, `st.dataframe`. Error text can quote evidence, so it goes in `st.code` too. Derive counts from validated data, not from the file's own summary fields.
- Audit log: append-only JSONL under `gui/audit/` (git-ignored): UTC timestamp, tool version, operator, action, input, SHA-256 before/after, outcome. Log once per distinct load (Streamlit reruns on every interaction). Label the operator "self-reported" and the log "append-only by this app, not tamper-proof".
- No absolute paths or usernames in the UI or audit log: repo-relative paths, or bare file name for files outside the repo. For `OSError` show `strerror`, not `str(e)`.
- Layout: sidebar = operator, input picker, filters, search. Main = integrity block, summary metrics, timeline chart, table with `on_select="rerun"` single-row selection, detail pane. Audit log in its own tab and on the failure screen.
- Demo data: synthetic only, from a deterministic generator (`gui/make_demo.py`), including one tampered sample that must be rejected. README screenshots use demo data, taken from a neutral path.
- Before finishing: load a hostile sample (valid hashes, markdown and an image link in text fields) from a temp folder and confirm it renders literally with no outbound request.
