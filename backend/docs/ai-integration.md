## AI Integration Added

### New API endpoints

- `GET /api/v1/posts/search?q=<query>`
  - Semantic + lexical search over approved posts.
- `GET /api/v1/posts/{id}/similar`
  - Finds visually/semantically similar approved posts.
- `GET /api/v1/posts/{id}/alt-text`
  - Generates accessibility alt text for media.

### AI model gateway

Config keys:

- `AI_ENABLED=true|false`
- `AI_TIMEOUT_MS=5000`
- `AI_EMBEDDING_ENDPOINT=<http endpoint>`
- `AI_MODERATION_ENDPOINT=<http endpoint>`
- `AI_SUMMARY_ENDPOINT=<http endpoint>`

Expected response payloads:

- Embedding endpoint:
```json
{ "embedding": [0.12, -0.03, 0.88] }
```

- Moderation endpoint:
```json
{
  "toxicity": 0.1,
  "spam": 0.05,
  "fakeNews": 0.01,
  "aiGenerated": 0.2,
  "plagiarism": 0.3,
  "botRisk": 0.1,
  "authenticity": 0.9,
  "flagged": false,
  "summary": "Passed multimodal moderation checks."
}
```

- Summary endpoint:
```json
{ "summary": "Concise 1-2 sentence output." }
```

If endpoints are not configured or fail, deterministic local fallbacks are used.
