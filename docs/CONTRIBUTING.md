# Contributing to GuardianAI

This is a final-year major-project research artifact. External contributions are not actively solicited at this stage.

If you find bugs or have feedback, please open an issue at https://github.com/syedwam7q/guardian-ai/issues.

## Development

See `docs/DEPLOYMENT.md` for local setup. The implementation plan in `docs/superpowers/plans/` is the source of truth for what's being built and in what order.

## Code style

- Backend: `ruff format` + `ruff check` (config in `backend/pyproject.toml`)
- Frontend: `prettier` + `eslint`
- Pre-commit hooks enforce formatting on every commit.
