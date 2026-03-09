# ESG Disclosure Analyzer

- Preserve current backend integration and existing FastAPI request/response behavior unless the task explicitly changes an endpoint.
- Preserve current frontend functionality: PDF upload, analysis flow, KPI cards, charts, chart-click filtering, page preview, AI assistant, exports, and lower-content tabs.
- Prefer incremental changes over broad rewrites. Reuse existing components, services, and data flow where practical.
- Keep TypeScript valid and avoid changing frontend contracts unless required by the task.
- When editing the AI assistant, preserve the existing evidence display and response shape unless explicitly instructed otherwise.
- For RAG work, build on the current analysis data, retrieval pipeline, and `/ask` flow instead of replacing them from scratch.
