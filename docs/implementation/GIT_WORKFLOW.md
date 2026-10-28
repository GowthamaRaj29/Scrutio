# Git workflow

The local repository was initialized with `main` as the default branch because the workspace did not contain Git metadata or a remote to inspect.

Use short-lived branches:

- `feat/<focused-change>`
- `fix/<focused-change>`
- `test/<focused-change>`
- `ci/<focused-change>`
- `docs/<focused-change>`

Keep pull requests focused and require the CI quality job before merging. Prefer squash merging. Do not add a `develop` branch unless the team or deployment workflow later requires one.

GitHub branch protection, required status checks, force-push restrictions, and repository settings must be applied by an authenticated repository administrator after the remote is connected. The local CI workflow is prepared at `.github/workflows/ci.yml`.
