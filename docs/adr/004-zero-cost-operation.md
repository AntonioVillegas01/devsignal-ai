# ADR 004: Bounded Free Tier operation, no paid fallback

Status: accepted.

The intended deployment is a public GitHub repository using hosted Actions and Pages, plus a Gemini AI Studio project with billing disabled. Only the explicit Flash Free Tier model allowlist is accepted. No search grounding, context caching, embeddings, database, server, or paid failover is enabled.

One run permits at most four calls: researcher, reviewer, one revision, final review. There are no SDK retries. Defaults allow one article per UTC day and cap input characters and output tokens. A 429 ends successfully without publishing. If the operator lowers the call budget, the pipeline stops when exhausted.

An application cannot determine whether the operator attached a billing account to its key, nor promise that a third party will retain its free terms or quotas. FREE_TIER_ONLY is an operational acknowledgement, not a billing API check. To keep the monetary bound at zero, keep billing disabled, use public-repository free hosting, and disable the schedule if provider eligibility changes. Quota shortages reduce availability instead of buying capacity.
