# ADR 003: Markdown and bounded JSON persistence

Status: accepted.

Approved articles live in content/articles as Markdown with structured YAML frontmatter. Frontmatter contains the draft, source snapshot, review, timestamp, and validation result. The rendered body must match the validated draft exactly. JSON stores up to 90 run metrics. The website reads these files only at build time.

Article creation uses a temporary file and an atomic hard link to avoid overwriting an existing slug. State writes use temporary files and atomic rename. Slugs are strict lowercase kebab-case; symlink article files are rejected. A local CLI lock and workflow concurrency enforce one writer.

Git provides inspectable history and rollback without a paid database. There is no cross-file transaction: a crash after article creation but before metrics persistence can leave an article without a run entry. The daily cap and duplicate checks derive from articles, so such a crash cannot create a second publication. CI verifies content before any remote commit or deploy. On an ambiguous partial failure, inspect and reconcile the files before rerunning.

The archive is intentionally small. Reading every article and comparing token sets scales linearly and should be reconsidered for tens of thousands of entries.
