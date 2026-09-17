# ADR 002: Commands and read-only queries without a bus

Status: accepted.

Collect, rank, generate, review, validate, publish, and run form named workflow operations. Some preparatory commands are pure; their CLI checkpoints represent the state transition. Queries accept only the read subset of repository interfaces and never create files or update usage metrics.

A command bus, event broker, and separate read database would add indirection without improving a once-daily serial job. Direct method calls expose dependencies and error paths. Stage CLI commands reuse the same handlers, while publication always revalidates the draft rather than trusting a saved flag.

This is logical CQRS, not distributed CQRS. There is one persistent representation and no eventual-consistency machinery.
