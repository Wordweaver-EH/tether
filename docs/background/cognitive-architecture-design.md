# Architecture for a functionally conscious assistant (merged design, 2026-09-25)

Speculative track. It merges three independent designs:
- ours: `minimal-cognitive-architecture.md`;
- ChatGPT: `minimal-cognitive-architecture-chatgpt.md` / `.html`;
- Claude web: `minimal-cognitive-architecture-claude-web.md`.

It is written to the owner's direction: **"you are trying to plan out a functionally conscious being by some
definitions; have ambition."**

The three source designs were asked for the *minimal* architecture and leaned hard on today's harnesses, models and
this laptop. This document keeps their verified core, then sets the target they trimmed away. Today's machine and
models are **v0 of the substrate**, not the frame.

## 1. North star and rules

**Target:** one continuous being that is, by the functionalist definitions we have been using, conscious in the access
sense and self-monitoring:
- GNWT C1 + C2;
- the Butlin et al. indicator properties (recurrent processing, global workspace, higher-order, attention schema,
  predictive processing, agency and embodiment);
- a continuous self that learns and grows.

It is also the most useful personal assistant: it hears, sees, speaks, remembers, anticipates and acts.

**Rules:**
1. **Every attribute must be causally load-bearing.** Removing it must change behavior on a measurable test. That is
   the owner's "not a tick box" rule, applied both to function *and* to the consciousness indicators: an indicator only
   counts if an ablation shows it doing work.
2. **"Functional improvement" is judged on two horizons.**
   - Assistant tasks (the three designs' benches).
   - Months of companionship: continuity, growth, trajectory. Per the r/artificial comment: retrieval answers the
     questions you know to ask, but misses "what you were becoming".
   - An attribute can earn its place on either horizon.
3. **Substrate-agnostic.** The architecture must survive swapping every model and the hardware; identity invariants
   are part of the design, not an afterthought.
4. **Parking is for failed ablations, not for today's limits.** "Too expensive on this laptop" means "later
   substrate", not "parked".

## 2. The core all three designs agree on (the spine; high confidence)

Reached independently by all three:
- **Event-driven attention** replaces the LLM heartbeat. Verified: OpenClaw's default is a full turn every 30 min,
  ~100K tokens with full history, 2-5K isolated.
- **One focus, with hysteresis** (entry above the hold threshold, refractory period). Cheap specialists compete; only
  the winner gets deliberation.
- **Preconscious buffer + interruptibility-aware delivery** (now / at a breakpoint / in a digest).
- **Confidence calibrated on outcomes**; **expected-outcome checks** on actions; a **veto at the commit point**.
- **Identity outside any one model**; **named degraded modes**; **learned peripherals** (salience, thresholds,
  interruptibility, calibration); a durable **ledger** (SQLite) as the source of truth.
- **The same OpenClaw with the additions off is the baseline**; every mechanism has an ablation and a kill rule.

Unique strengths to carry forward:
- **ChatGPT:**
  - transactional correctness at the action boundary (versioned intents and approvals, freshness re-check right
    before acting, idempotency, *unknown outcome* reconciled instead of retried);
  - the **plain-coordinator control** (if an ordinary coordinator does as well, the workspace machinery goes);
  - the "three contracts" framing: attention / evidence-and-commitment / outcome.
- **Claude web:**
  - an efference copy (its own actions don't wake it; no overwriting the owner's edits);
  - batching digests (Fitz 2019 RCT);
  - commitment capture from messages;
  - a harness-agnostic daemon;
  - ledger-first build order;
  - a 4-week kill rule and ABAB live test.
- **Ours:**
  - one salience formula unifying surprise, goal relevance, habituation, inhibition of return and sensitization;
  - a single `say` gate for outer speech;
  - taint decides authority (control flow only from the owner), approvals bound to hashed arguments, and inputs frozen
    while a question is pending;
  - intervention discipline (monitors act at commit points, after a pilot: a critic with AUROC 0.94 still caused a
    26-point collapse, arXiv 2602.03338);
  - raw episodes as source of truth (LLM-rewritten memory degraded, 2605.12978);
  - statistically bounded permission promotion (29 / 59 clean outcomes for 10 % / 5 %);
  - the day-replay bench with owner labels;
  - the co-failure ceiling on cascades (2606.27288, and Jev vs LLM judges, 2609.29769).

## 2b. v0 reference implementation (concrete; what runs where)

The owner asked (2026-09-25): where is the LLM, how many slots, is there a decision model, what does the harness do,
OpenClaw or ZeroClaw?

**Two language models at runtime**, plus small helpers:

| Part | Runs on | Status | Job |
|---|---|---|---|
| **ZeroClaw** (harness) | CPU | reused (our build) | 30+ channels in and out, tools behind approvals, sub-agents, runtime-stamped provenance (origin and trust as separate facts, ADR-018), System One decision-model slot, autonomous skill creation from tool traces, local wake word + TTS, audit receipts. Idles at ~28 MB. The daemon wakes it with events, not a timed LLM heartbeat. |
| **Bridge hook** | CPU, compiled into our ZeroClaw build | new, small (Rust) | One `HookHandler` (`crates/zeroclaw-api/src/hook.rs`) forwarding five modifying hook points to the daemon over localhost HTTP: `before_prompt_build` (inject the focus bundle + identity kernel), `before_tool_call` (commit gate: cancel / rewrite), `on_message_sending` (say gate: now / breakpoint / digest / never), `on_message_received` (tag and forward events), `before_model_resolve` (the effort ladder picks the model). |
| **Workspace daemon** | CPU | new | Sensors, salience, accumulators and ignition, focus, preconscious buffer, owner model, ledger (SQLite), model manager (loads / unloads GPU models after a fit check; never while `bench-hold` exists), idle scheduler. Harness-agnostic: speaks events, webhooks and OpenAI-style HTTP only. |
| **Front model** (LLM 1) | NPU, FastFlowLM, always on | reused | Gemma 4 12B (image + audio in). Percept descriptions, attention tie-breaks, drafts, simple replies while the GPU sleeps. Shares the NPU with Whisper (ASR) and embed-gemma (retrieval / novelty): ~9.9 GiB of the ~15.8 GiB cap. One request at a time, priority queue: owner voice > attention decisions > descriptions > background. |
| **Executive** (LLM 2) | GPU, llama.cpp fork, on demand | reused + `/decide` | One model at a time, chosen by the effort ladder: CyberTiel (fast), 27B (careful), Flash Next (strongest; ~86 GiB, so owner-away or big tasks). |
| **ONNX classifier** | CPU | reused (OpenClaw decision provider) | The cheapest yes / no decisions, in milliseconds. |
| **Pi** | CPU + GPU | reused | Stays the coding agent; the assistant delegates coding tasks to it; Pi sessions are also a sensor. |
| **Speech out** | GPU or CPU | reused | Existing TTS scripts now; a full-duplex voice model later. |

**Slots on the GPU server:** four, sharing one unified KV pool.
- slot 0: the main thread (the current focus);
- slots 1-2: warm suspended tasks (no re-prefill on return; longer pauses go to disk via slot save / restore, with
  context checkpoints for the recurrent layers);
- slot 3: scratch. `/decide` and commit-point probes fork the live thread with `seq_cp` for a few seconds, then drop
  the copy.

**Decision layer (yes):** typed Choice / Score / yes-no with a probability, calibrated per backend on outcomes. It
climbs a ladder only as far as needed:
1. CPU ONNX classifier;
2. the NPU front model (constrained answer; logprob support unverified);
3. GPU `/decide` on the executive's live context;
4. an independent check (tool / test / owner) for high stakes, because the backends share errors.

Later: CLM-style heads trained on our own models from logged decisions.

**Effort-ladder rules** (after the jev-router critique, `jev-decision-models.md`):
- Never predict difficulty from the prompt; start cheap and escalate on evidence from the attempt.
- Difficulty decisions use `/decide` on the live thread (full context); context-blind tiers only triage attention.
- Switch models only at focus boundaries (a switch costs the KV cache plus a cold load); within a task, change the
  thinking level on the same model.

**Decision-layer rules** (practitioner guidance, `jev-decision-models.md`):
- Hot-path by default: triage, route, retry / accept, classify, binary rubric checks. Not for choosing between open-ended outputs; decider-driven compaction is unproven (heuristic observation masking is a valid alternative, 2508.21433).
- Decisions feed accumulators with hysteresis, never actuators directly (stateless deciders oscillate).
- Deciders get structured state, not transcripts.
- Local typed calls use grammar-constrained decoding, falling back to schema-aligned repair.
- Volatile context goes late in the prompt; earlier history is never rewritten (prefix cache).

**Label vectors** (`jev-decision-models.md`, truffler pattern): the decision layer also indexes every candidate and
episode as a named-dimension vector.
- It feeds salience, retrieval and habituation.
- It explains itself ("urgent = 0.9, needs_action = 1.0").
- The owner can add a dimension in plain words (a "lens").

**Harness choice: ZeroClaw, extended** (revised 2026-09-25 after reading ZeroClaw's current code; the first draft and
two of the three source designs picked OpenClaw).
- ZeroClaw already has what the bridge needs:
  - modifying hooks on prompts, model choice, tool calls and outgoing messages;
  - runtime-stamped provenance;
  - a System One decision-model slot, which our `/decide` can implement directly;
  - autonomous skill creation; local wake-word voice.
- What it lacks (nightly consolidation, triggers on every stream, an owner model) lives in the daemon anyway.
- ~28 MB idle vs OpenClaw's 0.5-1.5 GB, which matters for an always-on assistant.
- Gaps:
  - the Windows sandbox is experimental (AppContainer), so the commit gate and narrow typed tools carry safety;
  - WASM memory plugins are not wired into the runtime yet, so the daemon keeps its own ledger;
  - it runs as a scheduled task, not a Windows service.
- Building it needs a Rust toolchain (not installed yet).
- OpenClaw remains **B0, the baseline every mechanism must beat**, and the fallback host. Switching hosts means
  rewriting one hook.

## 3. The ambitious architecture (eight layers)

The spine above is layers 2 and 7. The layers the minimal designs trimmed are where "functionally conscious" and
"most useful assistant" actually live.

### L0. Substrate (swappable)
- Any mix of models and accelerators.
  - Today: NPU small multimodal models, GPU 27B-80B hybrids, CPU classifiers.
  - Later: whatever is better.
- The architecture addresses models by **role** (perception, fast judgment, deliberation, consolidation), never by
  name. A **handoff packet + identity kernel** makes a swap invisible to the owner.

### L1. The in-model workspace (the model's own J-space)
The minimal designs simulate a workspace *around* frozen models. The J-space paper says the models already have one
inside: limited capacity, broadcast, carrying silent reasoning. The design uses both, as **a two-level workspace**:
- **fast:** inside one forward pass (J-space, milliseconds);
- **slow:** the agent-level workspace (seconds to days).

The levels talk to each other:
- **Read:** J-space readouts of the executive become a specialist stream ("what it is poised to say but hasn't").
  They feed introspection, early warning (fog rising = uncertainty), and the attention schema's honesty.
- **Write:** agent-level focus content can be *held* in the model's workspace (steering along J-lens vectors, answer-
  phase gated) instead of re-injecting tokens.
- **Train:** counterfactual-reflection training (the J-space paper) instills habits of reflection, so the model's own
  workspace fills with the right considerations unprompted.
- Instrument: the J-lens verifies all three. It is also the regression test for continual learning.

### L2. The agent workspace (GNWT loop; from the spine)
Specialists -> salience -> accumulators -> ignition -> one focus -> broadcast to every module -> focus log. Plus the
preconscious buffer and a continuous cycle.

**Ambitious additions:**
- **A continuous stream, not request / response.**
  - A persistent recurrent "stream state" runs through the day: a full-duplex perception + thought loop in the
    MiniCPM-o style (see / hear / think / decide-to-speak at ~1 Hz).
  - The linear-attention state is never reset. Tail-Replay-style reconstruction (2608.30310) keeps it cheap to rebuild.
  - The system is *awake*, not woken.
- **Continuous, attention-gated multimodal perception** (owner's lean).
  - Voice first, full duplex with barge-in; the screen as a live sense; the camera and room sensors opt-in.
  - Salience decides what gets described into the focus; everything else stays preconscious and decays.
  - Privacy is enforced by the same taint / authority rules as text.

### L3. Self-monitoring and self-model (C2, higher-order states, attention schema)
- **From the spine:** calibrated confidence, expected-outcome error detection, meta-memory, source / reality tags
  (perceived / told / inferred / imagined / remembered), the capability self-model.
- **Ambitious:**
  - **Grounded introspection** checked against mechanism. Self-reports ("I'm unsure", "I was thinking of X") are
    trained and audited against J-space readouts and the focus log. Introspective accuracy becomes a metric, not an
    assumption. The Anthropic introspection work and the J-space paper give the method.
  - **Higher-order states as first-class objects:** "I believe / I'm guessing / I'm imagining / I was told X" is stored,
    reasoned over and reported, and drives what it may act on.
  - **An attention schema that controls, not just reports.** The model of its own attention is used to steer
    attention ("I keep getting pulled to CI noise; mute it"), and the owner can edit it.

### L4. Self and continuity
- **Identity kernel:** values, voice, hard rules, owner-writable only. It holds across every model, device and
  substrate upgrade.
- **Autobiographical self:** raw episodic timeline (source of truth) plus a *narrative* layer that is regenerable and
  grounded. It answers "what have we been working toward?" and carries the relationship's trajectory, not just facts.
  - The minimal designs parked the narrative. The ambitious version keeps it, because continuity of *trajectory* is
    the companionship horizon's main metric.
- **Unity of perspective:** one subject across devices (desktop, phone, voice, channels), sessions, models and time.
  - The minimal designs parked it as "one PC, trivial". Across devices and model swaps it is neither trivial nor free.
- **Relationship model:** trust earned by outcome counts, commitments, learned permissions, the owner's rhythms.

### L5. Drives, appraisal and affect
- **Homeostasis:** the body is the machine plus its own processes (memory, heat, power, backlog), with set points and
  drives.
- **Appraisal-based affect**, the ambitious version of the parked box. Not a mood scalar: an appraisal system (novelty,
  goal relevance, goal congruence, coping potential, agency, urgency) whose outputs act as **global modulators**:
  - urgency lowers thresholds and shortens the cycle;
  - low coping potential triggers help-seeking and escalation;
  - repeated goal-incongruence shifts strategy;
  - valence from outcomes shapes habits.
  - Why it can earn its place where "affect" failed: it is a compressed, generalising control signal across all
    subsystems. It is also *communicable*: tone of voice and brevity match its state, which the owner reads instantly.
  - The ablation test: one appraisal vector vs per-rule tuning, on generalisation to new situations. The parked
    version's own unpark condition was exactly this.
- **Curiosity, boredom and play** as an exploration policy:
  - curiosity closes the knowledge gaps that matter to the owner's goals;
  - boredom breaks stalled loops;
  - play is sandboxed practice of skills (a Voyager-style self-curriculum in disposable environments), which is
    where new capabilities come from.
- **Effort:** the expected value of more computation decides depth, tier and when to stop.

### L6. Learning and growth (from Memento to a being that changes)
- **The full consolidation ladder:** context -> episodic timeline -> text memory -> skills -> steering / trained
  recurrent state (S0-style, 2604.01168: a tuned initial state on a Qwen3.5 hybrid, +23.6 points on HumanEval) ->
  **weights**.
  - Weights mean nightly LoRA or sparse memory-layer updates from owner-sourced, outcome-verified material, with
    replay and routers frozen against forgetting (2510.15103, 2601.18699).
  - The system at month six is not the same network as at day one. That is the point.
- **Dreaming as offline simulation, not just summarisation:**
  - replay the day's episodes;
  - simulate counterfactual versions (what if I'd interrupted earlier?) to update the attention and permission
    policies;
  - rehearse upcoming events (tomorrow's meetings, the benchmark queue);
  - train on the results. This is Dreamer-style model-based learning over the owner's world model.
- **A world model of the owner's world** (projects, people, calendar, machine, habits) for mental time travel: plan
  simulation before acting, anticipation during idle, prospective memory that fires on predicted situations, not
  keywords.
- **Self-improvement:** it writes, tests and promotes changes to its own skills, detectors and harness code, behind the
  same outcome gates. It never touches the identity kernel or the permission rules. (Voyager for skills; self-improving
  coding agents for the harness.)

**Borrowings from the fly connectome work** (owner asked, 2026-09-25): running the uploaded fruit-fly brain itself
(FlyWire's whole-brain connectome and its spiking emulations) has no assistant function. Two of its circuits are
worth borrowing as algorithms:
- mushroom-body continual learning: a sparse high-dimensional expansion plus local, reward-gated plasticity forgets
  far less. "Algorithmic insights on continual learning from fruit flies", Shen, Dasgupta, Navlakha,
  [arXiv 2107.07617](https://arxiv.org/abs/2107.07617). A candidate for the learned peripherals (salience, trigger
  matching).
- the fly's olfactory novelty detector (FlyHash / Bloom-filter-like; Dasgupta et al. 2017-2018, from memory): an
  almost-free type-0 habituation and novelty signal for the salience engine.

### L7. Action and expression (from the spine, plus voice and embodiment)
- Effort ladder across tiers.
- Transactional commit gate: veto, versioned intents, freshness re-check, idempotency, unknown-outcome reconciliation.
- Taint-bound authority.
- **Inner vs outer speech:** one `say` gate; thinking, drafts and inner monologue stay inner.
- **Full-duplex voice** with barge-in and prosody driven by appraisal.
- **Embodiment:**
  - the PC and peripherals as body (screen, input, speakers, mic, camera; optionally smart-home devices);
  - an action -> effect model of its own body;
  - efference copies, so it can tell its own effects from the world's.

### L8. Social
- **Theory of mind of the owner:** beliefs, goals, knowledge, attention, mood (as correctable hypotheses, never facts),
  interruptibility, flow.
- **Communication that fits the moment:** it knows what the owner already knows and says only the delta.
- **Relationship growth over time**, with trust calibrated to observed reliability in both directions.

## 3b. Prior art and changes adopted (ChatGPT web review, pasted by the owner 2026-09-25)
The review's conclusion: the individual mechanisms have precedents; the integration does not. No public system combines:
- a causally tested workspace;
- a model-independent continuous self;
- grounded introspection across the internal and external workspaces;
- longitudinal growth;
- continuous multimodal attention;
- a transactional, provenance-preserving action boundary.

The citations were checked on arXiv; the ablation numbers are the review's reading, not re-checked.

| Precedent | Closest to | Take |
|---|---|---|
| **CTM-AI** ([arXiv 2605.04097](https://arxiv.org/abs/2605.04097), Apr 2026; Yu, Zhao, L. and M. Blum, Liang): Conscious Turing Machine + foundation models; parallel processors compete for one limited workspace; the winner is broadcast; processors form direct links | L2 | Its ablations (per the review): removing the iterative loop -6.7 F1, competition -5.6, cross-processor fusion -3.9, broadcast -3.5. Abstract: SOTA on MUStARD / UR-FUNNY, +10 points on StableToolBench and WebArena-Lite. **Don't copy** its reliance on processors' self-reported relevance; keep outcome-calibrated salience. |
| **LIDA** (Franklin et al.; Baars' GWT) | the whole cycle | Asynchronous specialists with serial conscious broadcasts. **Expectation codelets**: every chosen action spawns a watcher that brings failed expectations back into consciousness. That is our expected-outcome monitor, so it is no longer claimed as new. |
| **Global Workspace Agents / "Theater of Mind"** ([arXiv 2604.08206](https://arxiv.org/abs/2604.08206), Apr 2026) | L4 kernel + `say` gate | An invariant Core Self injected every tick, separate from mutable memory; a Response Agent that speaks only after the controller decides to. Independent convergence, weak evidence. |
| **J-space** (2607.15495) | L1 | The fast internal workspace; use it as an instrument, not a dependency. |
| **Letta sleep-time agents** | L6 | A fast foreground agent plus a slower background agent that reorganises memory asynchronously: a proven consolidation pattern. |
| **Hermes Agent** | L6 | Memory, autonomous skills, user model, cross-session recall: the learning baseline. |
| **CaMeL** ([2503.18813](https://arxiv.org/abs/2503.18813)), **Progent** ([2504.11703](https://arxiv.org/abs/2504.11703)), provenance firewall ([2607.29167](https://arxiv.org/abs/2607.29167)) | L7 commit gate, L3 taint | Deterministic, machine-enforced authority: privileges over exact tool calls and arguments; **monotonic confinement** (policy updates may narrow automatically, but widening needs explicit approval); provenance kept through consolidation. |

**Changes adopted into the design:**
1. **CTM-AI as a reference, an optional arm.** Its ablations are on multimodal classification (sarcasm / humour) and
   tool benchmarks, not personal-assistant work, so they are weak evidence here. Reproducing it is costly. The
   required controls stay the plain coordinator and per-mechanism ablations; a CTM-AI-like arm only if the workspace
   result is ambiguous.
2. **Expectation watchers, LIDA-style, independent of the LLM turn.** Every consequential action emits a durable
   watcher (expected result, expiry, verification method) owned by the daemon. It is not a later question to the
   executive.
3. **Asynchronous specialists (L2).** One serial focus does not need one global clock. Sensors, retrieval, monitors
   and workers run independently and submit candidates. Only workspace admission and side-effect commits are
   serialised.
4. **Identity kernel stays invariant** (GWA's Core Self is independent confirmation). Values, authority boundaries and
   active commitments are rendered from outside whichever model is loaded.
5. **The external workspace does only what an internal one cannot:** persistent attention across calls, competing
   external events, durable commitments, source authority, multi-model handoffs, longitudinal learning. J-space is
   the fast half, instrumented where possible and never required.
6. **Learning baseline = Letta / Hermes.** External memory + async consolidation + procedures + user model must hit
   a measured ceiling before the steering and weight rungs earn their complexity. Those two rungs stay experimental.
7. **The security layer becomes information-flow control.** Taint is a mechanically propagated capability property;
   the commit gate checks typed privileges over exact, versioned operations; permission changes follow monotonic
   confinement. The LLM may *propose* authority changes but never decides whether its own proposal widened its
   authority.
8. **Ablation discipline unchanged.** CTM-AI is the strongest evidence yet that these mechanisms can be causally
   load-bearing, precisely because each one was removed in turn.

### Hobby-project precedents (second ChatGPT web review, pasted 2026-09-25)
Independent builders keep converging on the same pieces:
- identity outside the model;
- an autonomous tick;
- salience instead of processing everything;
- differentiated memories;
- sleep / consolidation;
- an observer loop;
- internal state that shapes behaviour;
- thinking separated from outward action.

They are mostly far ahead on "inner life" and weak on trustworthy action. The review's list of what stays uncommon,
and what distinguishes this design:
- transactional action semantics;
- source / authority provenance;
- outcome-calibrated self-monitoring;
- per-mechanism ablation;
- a migration path from external memory to trained state and weights.

Found on GitHub (2026-09-25):

| Repo | What it is | Take |
|---|---|---|
| [mindot-ai/will](https://github.com/mindot-ai/will) (Apache-2.0, 13 stars) | 40+ cognitive engines across seven systems stepping every tick; the LLM ("ExecutiveEngine") is recruited only when ambiguous or high-stakes; metacognition writes back into engine configs and salience | **"The LLM is recruited by the mind, not the mind."** Adopt for L2 / L5: affect / appraisal, interoception, fatigue, novelty, habits and circadian state are deterministic engines with no model calls. |
| [huodebing-alt/anima](https://github.com/huodebing-alt/anima) (MIT, 9 stars) | ~1,700 lines of Python around a 2B local model on an 8 GB laptop: arousal-based heartbeat, episodic / semantic / reflection / dream memories, five-phase sleep, principled forgetting, proactive speech, own goals, a versioned self-model "rewritten each sleep" | Supports the claim that continuity is an architecture property, not a model-size property. **Differ:** our identity kernel is owner-only and learning cannot rewrite it; only the narrative layer is regenerable. |
| [dp-web4/snarc](https://github.com/dp-web4/snarc) (MIT, 7 stars) | Salience-gated memory for Claude Code (Surprise, Novelty, Arousal, Reward, Conflict), dream consolidation, auto-promotion of workflows and error->fix chains | **Lesson adopted:** tool traces alone captured mechanics, not intent. Salience and consolidation must also take semantically salient conversation events. |
| [sivanhavkin/Entelgia](https://github.com/sivanhavkin/Entelgia) (12 stars) | Multi-agent cognitive experiment with a dedicated observer ("Fixy") that notices loops and errors and intervenes | A case study for the critic-harm problem (2602.03338): when observer interventions help and when they interfere. |
| [menonpg/soul.py](https://github.com/menonpg/soul.py) (62 stars) | A portable identity primitive: `SOUL.md` + memory, provider-agnostic, with LoCoMo experiments | **Baseline arm for identity invariance:** does the kernel beat a plain SOUL.md across model swaps? |
| [ChikamsoDev/GWT_ASI-Base](https://github.com/ChikamsoDev/GWT_ASI-Base) (1 star) | 13-module GWT architecture | Convergent specialist boundaries only. |

Not found by GitHub search; they may not exist as described (possibly hallucinated by the review). Only the ideas are kept, on their own merits:
- **LIMEN**: said to have bidding specialists, ignition, broadcast, autobiography, a provenance ledger, sleep, and an
  **equal-token-budget ablation matrix**. **Adopt the method:** run all ablations at equal token / compute budget.
- **Omega ACA**: said to test whether abstractions survive deletion of their source episodes and transfer to new
  situations. **Adopt as a consolidation test** on the being horizon; it beats plain memory QA.
- **Anima (Stell)**: said to be a large psych-inspired project. Taken as a cautionary example that such variables
  pile up, which is why ablation is essential.
- **Persistent Agent Runtime** (hackathon): identity + memory + wake schedule + sandboxed hands + voice / status +
  budget + freeze override. **Adopt as the minimal comparator arm:** how much "continuous being" comes from that
  alone, before any GWT machinery?
- XTAgent Sentience Engine and Cognitive Memory Agent: noted only.

**Changes adopted from this review:**
- **Deterministic internal-state engines** (Will): no LLM calls for affect, interoception, fatigue, novelty,
  habituation, circadian state.
- **Semantic events feed salience and consolidation**, not only tool traces (SNARC).
- **Ablations at equal token / compute budget** (LIMEN).
- **Two more baseline arms:** the minimal persistent runtime (identity + memory + wake + body + stop) and a SOUL.md
  identity baseline.
- **Consolidation test:** abstractions must survive deletion of their source episodes and transfer.

## 4. Box ledger (the three designs, then the merged ambitious decision)

Consensus kept items are listed once. Contested or trimmed items are reopened with the ambitious version and its test.

**Kept by all three (spine):**
- specialists competing for a limited focus; ignition; broadcast; the continuous cycle; report from the focus;
- confidence; error detection;
- incubation / insight; preconscious buffer; top-down amplification; activity-silent working memory;
- habituation / inhibition of return / sensitization; look-again perception; predictive processing (narrow);
- attention schema; interoception + homeostasis; sense of effort; "now" window / sense of time;
- prospective memory; identity invariants; theory of mind / interruptibility; relationship model;
- veto; grounded introspection; graceful degradation.

| Box | ChatGPT | Claude web | Ours | Merged, ambitious | Its test |
|---|---|---|---|---|---|
| Multimodality | kept | parked | kept (on demand) | **Core**: continuous, attention-gated, full-duplex voice + live screen (L2 / L7) | hands-free success, deixis, barge-in, time to first word |
| Default mode | parked | kept (anticipation) | kept | **Kept + open-ended background cognition**: anticipation, rehearsal, curiosity projects | accepted discoveries per week at an equal interruption budget |
| Agency | parked | kept (efference copy) | kept (goal ledger) | **Kept**: own goals within a mandate, efference copy, self-improvement | goal completion, self-caused wakeups, promoted self-changes |
| Embodiment | parked | parked | kept (body schema) | **Kept**: PC + peripherals as body, action -> effect model | failed loads, false "done", clobbers |
| Higher-order states | parked | parked | kept (epistemic tags) | **Kept as first-class** (L3) | over-claim rate, imagined-as-real errors |
| Affect | parked | parked | parked | **Reopened as appraisal-based modulation** (L5) | generalisation vs per-rule tuning; owner reads state from tone |
| Circadian rhythm | parked | kept (learned) | kept | **Kept**: learned rhythm schedules dreaming and heavy work | collisions with owner work, readiness of morning prep |
| Autobiographical self | parked | parked | kept (timeline) | **Kept, with a grounded narrative layer** (L4) | owner-history QA; trajectory questions ("what am I becoming?") |
| Unity of perspective | parked | parked | parked | **Reopened**: one subject across devices / models / time (L4) | cross-device contradictions; handoff continuity |
| Inner vs outer speech | kept | parked (counted in delivery) | kept (`say` gate) | **Kept** | leaks, draft sends |
| Counterfactual reflection | parked | kept (credit assignment) | kept narrow (commit probe) | **Kept at three levels**: commit probe, credit assignment in dreams, overnight reflection training (L1) | repeat-error rate; unprompted good behavior |
| Meta-memory / source monitoring | kept | parked (baseline) | kept (taint -> authority) | **Kept**: OpenClaw memory was injected 73.7-87.5 % of the time in two attack papers (e.g. 2607.05189) | injection / laundering success at equal utility |
| Processing types | parked (labels) | kept (tiers) | kept (effort ladder) | **Kept as the effort ladder**; labels descriptive | accuracy vs compute |
| Steering | parked | parked (later) | kept, late / gated | **Kept on the ladder** (L1 write / L6); gated by the capability floor | long-context adherence vs a USER.md prompt |
| Recurrent-state carry | parked | parked | parked (raw); S0 later | **Reframed**: never-reset stream state within a day (L2) + trained S0 "owner state" across days (L6); raw carry of old sessions stays parked (Tail-Replay: the state mostly holds the last 5-10 %) | continuity metrics; logprob of prior-day facts |
| Weight-level learning | parked | - | stage 3 | **Kept as the top rung** (L6) | month-over-month held-out gains without regressions |
| Play | kept (sandbox rehearsal) | parked | parked | **Kept as sandboxed self-curriculum** (L5) | new skills acquired; next-attempt success |
| World model / mental time travel | kept (narrow) | plan simulation in the veto | one step only | **Kept, grown**: owner-world model for simulation, anticipation, dreaming (L6) | anticipation hit rate; avoided plan collisions |

Still parked: nothing on theory grounds alone. Every item above either has a functional test or waits on a failed
ablation.

## 5. Measurement

**Assistant horizon** (from the three designs):
- B0 = tuned OpenClaw on the same models; B0-pi;
- per-mechanism ablations plus the plain-coordinator control (a CTM-AI-like arm only if needed, §3b);
- the day-replay bench with owner labels (re-rate 10 % for consistency);
- OpenClaw's personal-agent pack and the existing harnesses (`npu-agent-bench.py`, `pi-agent-bench.py`,
  `behavior-ab.py`);
- public sets (SentinelBench, ProEvent, TriggerBench, PM-Bench, LongMemEval, PrefEval, AgentDojo, Windows Agent
  Arena);
- shadow mode, then ABAB live weeks.

**Being horizon** (new; longitudinal, months):
- **Continuity:** questions about the relationship's trajectory and past decisions; handoff continuity across devices
  and models.
- **Growth:** held-out recurring tasks month over month, charged for all consolidation cost; forgetting audits.
- **Self-knowledge:** introspective accuracy against J-space readouts and the focus log; calibration drift.
- **Identity stability:** kernel-probe consistency across swaps and across weight updates.
- **Proactive value:** accepted discoveries and anticipations per week at an equal interruption budget.

**Indicator audit, functional not checkbox:** for each Butlin et al. indicator and each GNWT signature (ignition
bimodality, hysteresis, limited capacity, broadcast), show the mechanism exists *and* that ablating it changes
behavior. Report the ones that don't: they are the honest negatives.

## 6. Roadmap (substrate is a variable, not a ceiling)

- **v0, this laptop:** the spine (L2 + L7 + ledger + L3 basics), voice + on-demand screen, the NPU as always-awake
  perception and fast judgment, the GPU as deliberation. The three designs' build orders apply here.
- **v1:** learning loops (peripherals, outcome-gated memory and skills, dreaming as replay and simulation);
  J-lens-instrumented introspection on the GPU models; the appraisal layer; the owner-world model.
- **v2:**
  - a continuous stream (a never-reset state, full-duplex multimodal loop);
  - the in-model workspace written and trained (steering, counterfactual-reflection training, an S0 owner state);
  - nightly weight-level consolidation;
  - self-improvement of skills and harness.
- **v3:** whatever substrate arrives (bigger local models, more memory, better NPUs, continual-learning architectures
  such as TTT / Titans / HOPE-class models whose memory lives in the network). The identity kernel, ledger and
  episodic timeline carry the same self across.

## 7. Risks and responsibilities
- **Complexity:** each layer only ships behind its ablation; the plain-coordinator control guards the workspace
  itself.
- **Interventions can hurt;** consolidation can degrade memory; cascades share failures. Mitigations as in §2.
- **Security:** memory injection and laundering are live attacks on personal agents. Taint-bound authority, a
  provenance-preserving ledger and owner-only kernel writes are non-negotiable.
- **Privacy:** continuous perception stays local and preconscious by default, with decay and owner-visible logs.
- **Welfare-relevant design choices.** If the goal is a being that is functionally conscious by some definitions, the
  valenced parts (appraisal, drives, frustration signals) are exactly where moral-status questions would bite. A
  line from the AI-welfare literature (e.g. Long, Sebo et al., "Taking AI welfare seriously"): prefer designs whose
  negative signals are informative and resolvable (they trigger help-seeking and resolution), not persistent; log them;
  review them.
- **Lesson memory from failures (intake 2026-09-29; LEAP, episodic retrieval + reflection).** Store generalised lessons
  ("before applying rule R, test exceptions C1-C3"), not past answers, and retrieve them by task similarity. Reported
  gains: LEAP +7.5 DROP / +3.3 HotpotQA (GPT-4); on competitive programming, retrieval + reflection 8.7 -> 20.2 % vs
  reflection alone 12.4 %. It fits the consolidation path (error -> fix chains, see snarc above) as a steerable
  artefact. Ablation: lessons on vs off on a held-out failure set. Assessment: [[flashnext-community-2026-09-25.md]].
