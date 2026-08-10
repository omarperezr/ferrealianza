## Behavioral guidelines

- If multiple interpretations exist, present them — don't pick silently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused; don't remove pre-existing dead code unless asked.
- Every changed line traces directly to the user's request.
- Turn tasks into verifiable goals (test that reproduces the bug → make it pass); verify before reporting done.

These apply alongside the orchestration and graphify rules below — subagent specs carry them too.

## Orchestrated implementation workflow (token-efficient)

The main thread (whatever model is running it — Opus, Fable, etc.; "the orchestrator" below) is the scarce resource. Protect its context by pushing file churn into subagents via the **Agent tool**. **The default is DELEGATE.** Inline work is the exception and must qualify under the allowlist below. "Delegate" means an actual `Agent(...)` tool call this turn — not a plan to maybe make one.

**Inline allowlist — work in the main thread ONLY when one of these holds:**
- **Trivial edit**: you already know the exact file and lines; ≤1 file, no discovery, no test loop expected.
- **Hard core**: genuinely tricky quant/backtest/algorithmic logic where implementation *is* the reasoning. Implement that core inline — and still delegate the surrounding plumbing, wiring, and test scaffolding.
- **Pure conversation**: analysis or Q&A with no file churn.

**Tripwire**: if you find yourself 3+ Read/Grep/Glob calls or 2+ edit-test cycles into work that didn't qualify, stop and hand the remainder to a subagent instead of finishing inline.

**Lane 1 — Explore (reads).** Any discovery, orientation, log-reading, or diagnosis whose value is the *conclusion* → `Agent(subagent_type: "Explore")` (read-only, cheap, run several in parallel in one message when independent). Demand a compact return: file:line pointers, the mechanism, the traps — never file dumps. Include the graphify rules in the prompt.

**Lane 2 — Implement (writes).** One subagent does all reading, editing, and local testing in its own context:
1. **Spec (orchestrator)**: for small/medium tasks, put the spec directly in the Agent prompt; write scratchpad `SPEC.md` only when it exceeds roughly a screen. Either way it must be self-contained (subagents start cold): exact target files, required config keys, specific test commands, strict constraints (graphify rule, no commits), and a **Known traps** line listing non-obvious landmines found during investigation (e.g., pool ordering isn't stable; live fetches rewrite the cache). Omit conversational history.
2. **Model choice at spawn time**: `model: sonnet` for CRUD, boilerplate, and mechanical refactors; `model: opus` for complex work being delegated anyway; `subagent_type: "fork"` when the task needs this conversation's accumulated context (forks inherit it — skip the spec and just state the task). No triage layer: never spawn an agent whose job is to decide which agent to spawn.
3. **Edit style**: prefer targeted search/replace edits; a full-file rewrite only when the file is small and a rewrite is genuinely simpler.
4. **QA (orchestrator, mandatory)**: review the unified diff (ignore the subagent's transcript). Run tests with truncated output (e.g., `python -m pytest -q --tb=short`) and rerun the relevant backtest or diagnostic — the behavioral rerun is mandatory, since a diff can't show behavioral regressions. Only then report to the user.
5. **On QA failure**: do not respawn cold. Send the specific defect back to the *same* subagent via SendMessage (its context is intact). Cap at one retry; then fix inline.

**Rules**: always use command /caveman at agent startup; specs must be self-contained (subagents start cold); subagents never commit; QA judges the working tree, not the subagent's claims; independent subagents launch in a single message so they run concurrently.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions and exploration, run `graphify query "<question>"` first when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Reading a raw file directly (without graphify first) is fine only when you already know the exact file and lines you need to modify or debug — not for orientation or discovery.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Include these rules in every subagent prompt that involves code exploration.
