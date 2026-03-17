## Embedding Service Contract

When `app.duplicate.embedding.provider` is `clip-http` or `resnet-http`, backend calls:

- `POST {app.duplicate.embedding.endpoint}`
- `Content-Type: application/json`

Request:

```json
{
  "model": "clip",
  "mimeType": "image/png",
  "contentBase64": "<base64-media-bytes>"
}
```

Response:

```json
{
  "embedding": [0.0123, -0.294, 0.778]
}
```

If the endpoint is unset or fails, backend falls back to deterministic hash embeddings.
