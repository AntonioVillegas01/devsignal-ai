# ADR 001: Keep policy inside, integrations outside

Status: accepted.

The application needs deterministic testing of a workflow whose external model and sources are nondeterministic. Domain entities, URL rules, scoring, and similarity are independent of transport, filesystem, and web rendering. Application commands coordinate ports. Infrastructure adapters implement Gemini, HTTP ingestion, Markdown persistence, and process checks; the composition root supplies dependencies.

Zod is an intentional shared validation dependency: schemas define the domain contract and validate both external model output and persisted records. Next.js only imports read queries through a web composition module. ESLint enforces the inward dependency direction.

This introduces small interfaces but allows a complete pipeline test without credentials, network access, filesystem writes, or a command bus. The cost is explicit dependency wiring. We accept that cost because adapters can change without changing publication policy.
