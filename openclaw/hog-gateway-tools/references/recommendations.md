# Resource recommendations

Read before submitting candidates or checking/retrying a receipt. [Return to the Skill](../SKILL.md).

- Use the actual provider as `source_type`, a Knowledge category as `content_type`, and an evidenced source ID (`ciwei_id`) or URL. **Batch JSON uses `url`; single-candidate CLI uses `--resource-url`.** Put obtained original text in `full_content`, otherwise an excerpt in `summary`; include `published_at` only when known.
- Scores must be finite: `importance` −5…5, `relevance` 1…5. Preserve importance's sign without inferring sentiment. Publication requires `abs(importance)>=4`, `relevance>=4`, and a non-empty `recommend_reason`. Relevance 4 means directly related to the current stock/watchlist/research; 5 affects a key judgment. Impact alone is not relevance. Omit unknown scores for Gateway evaluation; skip known ineligible candidates. Unscorable candidates are skipped; evaluation errors can fail the batch.
- `--batch-file` takes an object with non-empty `batch_id`, `scene`, and 1–90 candidates, each with `source_type` and `title`. Scenes: `agent`; `stock_news` with a watched `stock_code`; `morning_briefing` / `closing_summary` with real `work_id` and `task_id`. Gateway validates ownership, sources, scoring, and quotas. Single-candidate mode supports the same content/scoring fields via named flags in `--help`.
- Reuse the same batch ID and unchanged payload after an uncertain submission; this returns the existing receipt, **not a retry of a failed batch**. Changed payloads need a new ID. Single-candidate submissions receive fresh server IDs; use batch mode when submission retries must be idempotent.

Example batch file; replace placeholders with actual evidence:

```json
{
  "batch_id": "stable-operation-id", "scene": "morning_briefing",
  "work_id": "actual-work-id", "task_id": "actual-task-id",
  "candidates": [{
    "source_type": "ciwei", "content_type": "News", "ciwei_id": "actual-news-id",
    "title": "Actual title", "summary": "Evidence used in the report",
    "importance": -4, "relevance": 4, "recommend_reason": "Directly affects the watched company"
  }]
}
```

- For morning/closing reports, submit candidates actually used, including those awaiting scores, with the matching scene/Work/Task **before reporting completion**. If none remain after excluding known ineligible candidates, submit nothing. Gateway waits for successful Work completion, then publishes at most five per user/report date/type across Agents, retries, and remakes. Never bypass this quota with `agent` scene; finish the report without waiting for its pending batch.
- Read the returned receipt ID with `recommend-status`; when `status=failed` and a retry is appropriate, use `recommend-retry`, then query again. `completed` may publish zero items after filtering; the receipt is not a publication count. Missing receipts fail. These application batches are separate from MCP Tasks, so Task polling/`--no-wait` do not control them.
- Receipt commands require `resource:recommend` and the Gateway companion fixes. Recommendations expire after 30 days; duplicates do not extend expiry. Users choose classification, tags, and optional comments when saving to Knowledge.
