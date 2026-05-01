# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands go through `uv` — never invoke `python` directly.

```bash
# Install / sync dependencies
uv sync

# Run the CLI pipeline (PDF → quiz CSV)
uv run -m src.main --input docs/sample_textbook.pdf
uv run -m src.main --input <pdf> --output <csv>          # custom output path

# Tests
uv run pytest                                            # full suite
uv run pytest tests/test_export.py                       # single file
uv run pytest tests/test_export.py::test_name -v         # single test

# Smoke-test the LLM factory (calls the configured provider)
uv run -m src.agent.llm
```

The CLI entry point is registered as `quizzer` (`src.main:cli`) in `pyproject.toml`.

## Configuration

Configuration is centralized in `src/core/settings.py` (Pydantic `BaseSettings`, reads `.env`). Notable settings:

- `MODEL_PROVIDER` — `google` | `groq` | `openai` (default `openai`); selects which client `src/agent/llm.py::get_llm` returns.
- Per-provider `*_API_KEY` and `*_MODEL` pairs. Even though only one provider is used at runtime, `Settings` requires all three API keys to be present (they can be empty strings in `.env`).
- `GEN_CONCURRENCY` (default 5) — passed as `max_concurrency` into the LangGraph `RunnableConfig` and bounds the Map-Reduce fan-out.
- `LANGSMITH_*` — tracing is on by default; set `LANGSMITH_API_KEY` to record traces.

## Architecture

Quizzer is an async LangGraph Map-Reduce pipeline. The high-level shape is **PDF → pages → chunks → (fan-out: generate ↔ review) → aggregate → CSV**. Understanding the data contract between stages requires reading several files together.

### Graph composition (`src/agent/graph.py`)

There are two compiled graphs:

1. **Main graph** (`build_graph`): `START → page_ingestor → chunking → subgraph_generator → aggregator → END`. The edge from `chunking` is a *conditional* edge that uses `route_chunks_to_subgraph` to emit one `Send("subgraph_generator", {"chunk": chunk})` per chunk — this is the fan-out.
2. **Generator subgraph** (`build_generator_subgraph`): `START → quiz_generator → quiz_reviewer → (regenerate ↔ completed)`. Loops up to `MAX_SUBGRAPH_ITER = 3` times if the reviewer marks the quiz not relevant. Each subgraph node has a `RetryPolicy(jitter=True)` for transient LLM errors.

The main graph is compiled with an `InMemorySaver` checkpointer; `graph_ainvoke` streams updates with `stream_mode="updates"` and then calls `aget_state` to return the final `StateSnapshot`.

### State shape (`src/agent/state.py`) — the critical detail

`GlobalQuizState.final_quiz` is `Annotated[list[FinalQuizItem], add]`. The `add` reducer is what makes the Map-Reduce work: each parallel `subgraph_generator` invocation returns `{"final_quiz": [...]}` and LangGraph concatenates them automatically. **If you change how subgraph results are returned, preserve this reducer contract** — returning a non-list, or returning under a different key, breaks aggregation silently.

`SubGraphState` is a separate TypedDict (chunk + quiz + iter_count + is_quiz_relevant) used only inside the subgraph. The subgraph receives a single `chunk` from the `Send` payload and is responsible for the generate/review loop on that chunk alone.

### Quiz normalization (`quiz_generator`)

LLMs return structured output via `LLM.with_structured_output(MultipleQuiz)`, but the generator defensively handles both Pydantic-model and raw-dict responses, and accepts options either as `option_a/b/c/d` fields or as a nested `options: {"A": ..., "B": ...}` dict. Answers outside `{A, B, C, D}` are coerced to `"A"`. Keep this normalization in mind before tightening schemas — providers diverge in how they emit structured output.

### Pipeline plumbing

- `src/agent/utils/ingest_pdf.py` — PDF → `list[PDFPageData]` (pymupdf, page-level).
- `src/agent/utils/chunk_pdf_content.py` — `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)`. Each chunk gets a random `chunk_id` (`{n}_{hex}`) and carries its source `page_number` forward into every quiz item.
- `src/agent/llm.py` — module-level `LLM = MODEL = get_llm()`; pick the provider via `MODEL_PROVIDER`. All three provider clients are instantiated at import time.
- `src/utils/export.py::export_quizzes_to_csv` — writes the LMS-ready CSV (Question / Option A–D / Correct Answer / Explanation). Defaults to `outputs/quiz_export_<timestamp>.csv` when no custom path is given.

## Repository conventions

From `copilot-instructions.md` (treat these as load-bearing):

- **Logging**: import from `src/core/logger.py` (`from ..core import logger`). Do not import `loguru` directly anywhere outside `src/core/logger.py`.
- **Configuration**: import the `settings` singleton from `src/core/settings.py`. Do not call `dotenv.load_dotenv` or read `os.environ` ad-hoc (the one exception is `src/main.py`, which loads `.env` before importing settings).
- **Package management**: use `uv` for everything (`uv sync`, `uv run`, `uv add`, `uv remove`). No `pip`, no bare `python`.
- **Tests**: live in `tests/` only — never colocated under `src/`. Use `pytest`. When you add or change a class/function, check for an existing test and update it; if none exists, add one in `tests/`.
