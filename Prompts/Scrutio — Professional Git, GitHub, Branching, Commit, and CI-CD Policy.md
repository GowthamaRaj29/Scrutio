# SCRUTIO — PROFESSIONAL GIT, GITHUB, BRANCHING, COMMIT, AND CI/CD POLICY

## 1. OBJECTIVE

You are working on the existing GitHub repository:

**Repository:** `GowthamaRaj29/Scrutio`  
**Remote:** `https://github.com/GowthamaRaj29/Scrutio.git`

Your responsibility is to maintain a clean, professional, secure, maintainable, and auditable GitHub repository throughout the entire Scrutio development lifecycle.

The repository must follow professional software engineering practices suitable for a serious software product.

**GitHub is not a dumping ground for unreviewed changes. Every commit, branch, pull request, workflow, and release must have a clear purpose.**

These rules apply to every development phase, including system design, implementation, refactoring, testing, documentation, dependency upgrades, bug fixes, and deployment.

---

## 2. INSPECT THE EXISTING REPOSITORY FIRST

Before changing Git configuration, creating branches, modifying workflows, or pushing code:

1. Inspect the current repository structure.
2. Identify the default branch.
3. Inspect existing branches, recent commits, tags, and pull requests where accessible.
4. Review the existing README, `.gitignore`, dependency manifests, tests, and GitHub Actions workflows.
5. Identify existing branch protection rules where accessible.
6. Inspect uncommitted changes using Git status.
7. Identify staged, unstaged, untracked, and ignored files.
8. Review existing CI/CD and deployment configurations.
9. Identify secrets, generated files, build artifacts, and accidentally tracked dependencies.
10. Determine which repository conventions already exist and should be preserved.

Do not assume that the default branch is `main`; verify it.

Do not overwrite an existing repository configuration simply because a different convention is preferred.

Do not discard, reset, clean, stash, or overwrite the developer's existing work without explicit authorization.

If the repository contains existing work, preserve it and build upon it.

If remote access is unavailable, inspect the local Git repository and clearly report which remote settings could not be verified.

---

## 3. PROFESSIONAL BRANCH STRATEGY

Use a simple, consistent branching model.

### Permanent branches

| Branch | Purpose |
|---|---|
| `main` | Stable, reviewed, releasable code |
| `develop` | Optional integration branch for coordinated development |

Do not introduce `develop` automatically. For a solo developer or small project, short-lived feature branches merged into `main` may be simpler and more maintainable.

Choose one branching model and document it. Do not mix multiple branching strategies without a concrete reason.

### Short-lived branches

Use the following naming conventions:

| Prefix | Purpose | Example |
|---|---|---|
| `feat/` | New functionality | `feat/investigation-engine` |
| `fix/` | Bug fixes | `fix/session-expiry` |
| `refactor/` | Behavior-preserving restructuring | `refactor/api-validation` |
| `perf/` | Performance improvements | `perf/query-optimization` |
| `test/` | Test additions or corrections | `test/investigation-service` |
| `docs/` | Documentation changes | `docs/system-architecture` |
| `build/` | Build and dependency configuration | `build/typescript-config` |
| `ci/` | CI/CD changes | `ci/quality-gates` |
| `security/` | Security fixes | `security/tenant-isolation` |
| `chore/` | Routine maintenance | `chore/repository-cleanup` |

Branch names must be:

- Short.
- Descriptive.
- Lowercase.
- Hyphen-separated.
- Related to one logical task.

Avoid names such as:

- `changes`
- `updates`
- `new-work`
- `final`
- `final-v2`
- `testing`
- `temp-branch`
- `my-branch`
- `all-fixes`

Do not keep creating new permanent branches for individual tasks.

### Branch lifecycle

1. Start from the correct up-to-date base branch.
2. Create a branch for one coherent task.
3. Implement the task.
4. Run the relevant tests and quality checks.
5. Review the complete diff.
6. Commit the work in meaningful units.
7. Push the branch.
8. Open a pull request when required by the selected workflow.
9. Merge only after the required checks pass.
10. Delete the merged short-lived branch when appropriate.

Never develop unrelated features in the same branch merely for convenience.

---

## 4. MANDATORY COMMIT QUALITY POLICY

### 4.1 Every commit must communicate a meaningful change

A commit must represent one coherent, understandable unit of work.

Good examples:

```text
feat: add investigation request validation
fix: prevent duplicate investigation records
perf: cache normalized lookup results
test: cover expired session handling
docs: document database migration strategy
refactor: isolate transaction lookup logic
security: enforce tenant-scoped record access
ci: validate TypeScript builds on pull requests
build: pin supported dependency versions
```

Bad examples:

```text
update
changes
final
final changes
latest code
new code
fixed
bug fixes
working now
test
testing
done
all updates
misc
small changes
```

These bad examples do not explain what changed or why.

### 4.2 Use Conventional Commits

Follow the Conventional Commits format:

`<type>[optional scope]: <short description>`

Recommended types:

| Type | Meaning |
|---|---|
| `feat` | Introduces functionality |
| `fix` | Corrects a defect |
| `perf` | Improves performance |
| `refactor` | Restructures code without intentionally changing behavior |
| `test` | Adds or improves tests |
| `docs` | Documentation changes |
| `build` | Build system or dependency changes |
| `ci` | CI/CD changes |
| `security` | Security-related changes |
| `chore` | Routine maintenance |
| `revert` | Reverts an earlier commit |

Examples:

```text
feat(auth): add refresh token rotation
fix(api): reject malformed investigation filters
perf(db): index investigation status queries
test(auth): cover refresh token reuse
docs(api): document investigation endpoints
ci(github): run tests on pull requests
```

Use scopes only when they add clarity. Do not invent an unnecessarily large taxonomy.

Do not use `feat` for documentation-only changes or `refactor` for code that changes behavior.

### 4.3 Commit message length

Commit subjects must be short and specific.

Target:

- Prefer approximately 50 characters.
- Keep subjects within 72 characters.
- Use the imperative mood.
- Start the description with a lowercase verb where appropriate.
- Do not end the subject with a period.
- Avoid unnecessary filler.
- Do not put an entire explanation into the subject line.

Examples:

Good:

```text
fix(auth): reject expired refresh tokens
```

Bad:

```text
fix: I have fixed the authentication issue that was causing problems
```

### 4.4 Commit body

A commit body is optional.

Add one when the change needs additional context, such as:

- Why the change was necessary.
- Important implementation decisions.
- Security implications.
- Breaking changes.
- Migration requirements.
- Compatibility constraints.

Example:

```text
fix(investigation): prevent duplicate submissions

Use an idempotency key to prevent repeated requests from
creating duplicate investigation records.

Add integration coverage for repeated submissions.
```

Do not add an unnecessary body to a self-explanatory commit.

### 4.5 One logical change per commit

Prefer several meaningful commits over one enormous commit containing unrelated work.

For example:

```text
feat(api): add investigation request schema
feat(api): implement investigation creation
test(api): cover investigation creation failures
docs(api): document investigation creation endpoint
```

However, do not split a single trivial change into multiple artificial commits merely to increase commit count.

**The objective is meaningful history, not the maximum number of commits.**

### 4.6 Never create garbage commits

Do not create commits simply because:

- A file was opened or touched.
- A development session ended.
- The agent wants to save intermediate progress.
- A generated timestamp changed.
- Formatting altered unrelated files.
- A README was updated without a meaningful reason.
- A dependency lockfile changed unexpectedly.
- The agent wants to demonstrate activity.
- A previous commit was already sufficient.

Before committing, ask:

1. Does this change provide real value?
2. Is the change logically coherent?
3. Does the commit message accurately describe it?
4. Have unrelated changes been excluded?
5. Have the required checks passed?
6. Can another developer understand the change from the history?
7. Is this commit necessary, or does it duplicate another commit?

If the change is unnecessary, do not commit it.

### 4.7 Do not lie about validation

Never claim that tests, builds, linters, security checks, or deployments passed unless they actually ran and passed.

If a test cannot run because of a missing tool, unavailable service, or environment restriction, report that limitation.

Do not use a successful commit as evidence that the implementation is correct.

---

## 5. PRE-COMMIT QUALITY GATE

Before every commit, perform the following checks as applicable.

### Git checks

```bash
git status --short
git diff --check
git diff
git diff --cached
```

Review staged changes separately from unstaged changes.

Do not stage everything automatically using `git add .` without reviewing the resulting file list.

Prefer explicit staging:

```bash
git add src/modules/investigation/
```

Or stage individual files when appropriate.

Before committing:

- Confirm only intended files are staged.
- Remove accidental generated files from the staged changes.
- Verify no secrets or credentials are included.
- Verify no unrelated user changes are included.
- Verify no temporary debugging code remains.
- Verify no obsolete code was retained accidentally.
- Verify no large binary files were added without justification.

### Project checks

Run the applicable commands defined by the repository:

```text
Formatting
Linting
Type checking
Unit tests
Integration tests
Build
Security and dependency checks
```

Do not invent npm scripts or assume a particular tool is installed.

Inspect the actual project configuration and execute the correct commands.

For a documentation-only change, run relevant Markdown or link checks if configured. Do not run irrelevant application tests without a reason.

If a required check fails, investigate and resolve the issue before committing, unless the change is an explicitly documented work-in-progress commit allowed by the project workflow.

Do not bypass a quality gate merely to make CI green.

---

## 6. GIT SAFETY RULES

The following operations require special care:

- `git reset --hard`
- `git clean -fd`
- `git push --force`
- `git push --force-with-lease`
- Rewriting published history.
- Deleting branches.
- Deleting tags.
- Resetting a branch to a different commit.
- Overwriting configuration or generated files.
- Removing files that may contain developer work.

Do not execute destructive Git operations without first inspecting their impact and obtaining explicit authorization when they could discard work or rewrite shared history.

Never force-push to `main` or another protected shared branch.

Do not amend or rewrite commits that have already been published to a shared branch unless the repository's explicit recovery procedure requires it and authorization has been obtained.

If a mistake occurs:

1. Inspect the current repository state.
2. Identify which changes are safe to preserve.
3. Determine whether the commit is local or published.
4. Choose the least destructive recovery strategy.
5. Preserve unrelated work.
6. Document the correction when appropriate.

Never use Git cleanup commands as a substitute for understanding repository state.

---

## 7. PROFESSIONAL PULL REQUEST POLICY

When using a pull-request workflow, each pull request must solve one coherent problem.

### Pull request title

Use a short Conventional Commit-style title.

Examples:

```text
feat: add investigation creation API
fix: enforce tenant-scoped queries
test: add authentication regression coverage
ci: enforce build and test checks
```

### Pull request description

Use this template:

```markdown
## Summary
- Describe the key change.
- Explain the intended behavior.

## Motivation
- Identify the problem or requirement addressed.

## Implementation
- Summarize the main technical decisions.

## Validation
- List the tests and checks actually executed.
- Report any failures or checks that could not run.

## Security and Data Impact
- Describe relevant security, database, or migration implications.
- State "None" only after verifying that no relevant impact exists.

## Related Requirements
- Reference requirement IDs, issues, or design documents.

## Deployment Notes
- Include configuration changes, migrations, or rollout instructions.
```

Keep pull requests reasonably small and reviewable.

If a change is too large, split it into logically dependent pull requests when feasible.

Do not create empty pull requests or open multiple overlapping pull requests for the same work without a clear reason.

Do not merge failing changes merely to continue development.

---

## 8. PROFESSIONAL MERGE POLICY

Use a consistent merge strategy.

**Recommended default: squash merging for short-lived feature branches**, especially when a pull request contains several intermediate development commits.

This produces a concise main-branch history while allowing the pull request to preserve the detailed development discussion.

The squash commit message must still be meaningful and follow the project's commit convention.

For example:

```text
feat(investigation): add request validation
```

Do not squash away meaningful historical information if the project has a justified need to preserve individual commits.

Avoid mixing merge commits, rebasing, and squashing unpredictably.

If linear history is required, configure the repository to support and enforce the selected strategy.

---

## 9. PROFESSIONAL REPOSITORY STRUCTURE

Inspect the existing codebase before changing its layout.

Do not force a monorepo or a particular framework structure if the requirements do not justify it.

Use a structure appropriate to the actual Scrutio architecture.

A possible starting point is:

```text
Scrutio/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── dependency-review.yml
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── docs/
│   ├── system-design/
│   ├── architecture/
│   ├── implementation/
│   ├── development/
│   ├── deployment/
│   └── security/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── shared/
├── tests/
├── scripts/
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .npmrc
├── CONTRIBUTING.md
├── LICENSE
├── README.md
└── SECURITY.md
```

This is a proposed structure, not a mandatory directory list.

Create `apps/`, `packages/`, and `tests/` only when they fit the selected architecture. Do not create empty directories or unused packages just to imitate an enterprise repository.

For a modular monolith, keep business modules organized within the actual application boundaries.

### Repository hygiene

- Keep the root directory clean.
- Maintain a useful README.
- Document local development and testing.
- Document environment-variable setup using a safe example file.
- Ignore local secrets, build outputs, caches, and generated artifacts.
- Commit lockfiles for applications using package managers that support them.
- Avoid duplicate documentation that can drift out of sync.
- Keep architecture and implementation decisions in appropriate documentation.
- Store database migrations in a predictable location.
- Keep test files near their modules or in a consistent central test structure.
- Avoid unnecessary nested directories.
- Do not commit dependency directories such as `node_modules/`.
- Do not commit real `.env` files containing credentials.
- Do not commit personal IDE settings unless the project explicitly standardizes them.
- Do not commit temporary debugging output, logs, coverage artifacts, or local database files unless explicitly required.

Maintain a `.gitignore` that reflects the actual stack instead of copying an unrelated template.

### Documentation maintenance

Update documentation when a meaningful change affects:

- Public APIs.
- Environment variables.
- Database schemas.
- Migrations.
- Authentication.
- Security controls.
- Architecture.
- Setup instructions.
- Deployment.
- Dependencies.
- Operational behavior.

Do not create documentation commits for meaningless changes.

Do not update documentation just to create another commit.

---

## 10. CI/CD POLICY

Use GitHub Actions or another verified free CI/CD option.

The pipeline must remain within the applicable free usage allowance.

Official documentation:

- GitHub Actions: https://docs.github.com/en/actions
- Branch protection: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
- Pull requests: https://docs.github.com/en/pull-requests
- Dependency review: https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review

Verify the current documentation before configuring workflows.

### CI pipeline

Implement checks appropriate to the actual stack.

A typical pipeline should perform:

1. Repository checkout.
2. Runtime setup.
3. Dependency installation using the lockfile.
4. Formatting verification.
5. Linting.
6. Static type checking.
7. Unit tests.
8. Integration tests where the required environment is available.
9. Production build.
10. Dependency vulnerability checks.
11. Additional security checks where appropriate.

Do not create a workflow that reports success while silently skipping required checks.

Do not add duplicate workflows that perform the same expensive tasks without justification.

Do not make tests dependent on paid APIs or external services when reliable local test doubles can be used.

Do not print secrets or sensitive environment values in CI logs.

### Workflow triggers

Configure appropriate workflows for:

- Pull requests targeting protected branches.
- Pushes to relevant branches.
- Manual execution for supported maintenance tasks.
- Release tags or release publication where appropriate.

Avoid running full deployment workflows for every trivial change unless required.

Use path filters carefully: a required status check must not be skipped in a way that blocks or bypasses the intended merge protection.

Use unique, descriptive workflow and job names.

### CI must fail when

- Formatting checks fail.
- Linting fails.
- Type checking fails.
- Required tests fail.
- The production build fails.
- Required security checks fail.
- Dependency installation is inconsistent with the committed lockfile.

Document any deliberate exceptions and their security implications.

---

## 11. BRANCH PROTECTION AND MERGE CONTROLS

Protect the default branch using GitHub branch protection rules or repository rulesets, where supported.

Recommended settings:

- Require pull requests before merging.
- Require the CI checks appropriate to the project.
- Block force pushes.
- Prevent branch deletion.
- Require linear history if the selected merge strategy depends on it.
- Resolve review conversations before merging when reviews are used.
- Restrict bypasses where practical.

For a solo-maintained repository, do not require an independent approving review if no second reviewer exists and that setting would make the workflow unusable.

Instead, require successful CI checks and use a documented self-review process.

Do not disable protection simply because a check is inconvenient.

GitHub documents branch protection availability for public repositories on GitHub Free, but specific capabilities and settings must be checked against the repository's current plan and configuration.

**The agent must distinguish between recommending a protection rule and actually configuring it.** If it lacks repository administration permissions, provide the exact manual steps rather than claiming the rule was enabled.

---

## 12. RELEASE AND TAGGING POLICY

Use semantic versioning when the project reaches a stage where releases are meaningful.

Format:

`MAJOR.MINOR.PATCH`

Examples:

```text
v0.1.0
v0.2.0
v1.0.0
```

Before creating a release:

- Confirm the release scope.
- Run the required tests.
- Verify the production build.
- Review database migration compatibility.
- Check dependency changes.
- Review security-sensitive changes.
- Update the changelog or release notes when appropriate.
- Confirm that the deployment process is documented.

Do not create tags for every commit.

Do not publish a release just to demonstrate activity.

Do not label an incomplete or unverified build as production-ready.

For unreleased development, use a simple `CHANGELOG.md` or release notes only if they provide genuine value.

---

## 13. DEPENDENCY AND LOCKFILE DISCIPLINE

Dependency updates must be intentional and traceable.

Before changing dependencies:

1. Identify why the dependency is required.
2. Consult the current official documentation.
3. Check maintenance and support status.
4. Check compatibility with the existing stack.
5. Review security advisories.
6. Review licensing where relevant.
7. Assess bundle size and runtime cost where applicable.
8. Verify the package's cost implications if it relies on an external service.
9. Update the correct lockfile.
10. Run the relevant tests and build.

Do not upgrade unrelated packages merely because newer versions exist.

Do not install a dependency to replace a few straightforward lines of maintainable code without a clear justification.

Do not remove a dependency until its usage and transitive impact have been reviewed.

Do not manually edit generated lockfile content.

Use a package manager consistent with the existing project.

---

## 14. SECURITY AND SECRET PROTECTION

Never commit:

- API keys.
- Access tokens.
- Private keys.
- Database passwords.
- Production credentials.
- Real environment files containing secrets.
- Private customer data.
- Production database dumps.
- Sensitive logs.
- Authentication cookies or session tokens.

Use example configuration files such as `.env.example` containing placeholder values only.

If a secret is accidentally committed:

1. Stop further exposure.
2. Notify the developer.
3. Revoke or rotate the exposed credential immediately.
4. Inspect the affected history and exposure.
5. Remove the secret from the current tracked files.
6. Follow an appropriate history-remediation procedure if necessary.
7. Verify that the secret is no longer active.

Deleting a secret from the latest commit does not make an exposed credential safe.

Do not rewrite repository history without considering collaborators, forks, clones, and other copies.

---

## 15. AGENT EXECUTION POLICY

During every development task, the agent must follow this sequence:

### Step 1 — Understand

- Read the relevant requirements.
- Inspect the current branch and working tree.
- Identify the files and modules involved.
- Determine whether the task belongs in an existing branch or a new branch.

### Step 2 — Plan

- Define the smallest coherent implementation.
- Identify affected modules.
- Identify tests and documentation that must change.
- Identify security and migration risks.
- Determine the intended commit boundaries.

### Step 3 — Implement

- Make focused changes.
- Avoid unrelated refactoring.
- Avoid unnecessary formatting churn.
- Preserve existing developer changes.
- Keep code and documentation consistent.

### Step 4 — Validate

- Run relevant checks.
- Inspect the full diff.
- Inspect the staged files.
- Verify that no secrets or generated artifacts are included.
- Confirm that the implementation matches the intended behavior.

### Step 5 — Commit

- Create meaningful commits.
- Use Conventional Commits.
- Keep each commit focused.
- Do not create empty commits.
- Do not create placeholder commits.
- Do not claim validation that did not happen.

### Step 6 — Integrate

- Push only to the intended branch.
- Open a pull request when required.
- Ensure CI checks pass.
- Review the change summary.
- Merge only under the documented branch policy.

### Step 7 — Report

Provide a concise summary containing:

- What changed.
- Which requirements were addressed.
- Important files affected.
- Tests and checks actually executed.
- Commit hashes and messages.
- Branch and pull-request information, if applicable.
- Known limitations or unresolved issues.

Never claim that a push, pull request, merge, branch protection change, or deployment occurred unless it actually succeeded.

---

## 16. PROFESSIONAL COMMIT EXAMPLES FOR SCRUTIO

Example development history:

```text
docs: define investigation system architecture
ci: add pull request quality checks
build: configure TypeScript strict mode
feat(auth): add session validation
test(auth): cover expired sessions
feat(investigation): validate creation requests
feat(investigation): persist investigation records
test(investigation): cover invalid requests
perf(db): index investigation status lookups
security(api): enforce record ownership
docs(api): document investigation endpoints
```

These are illustrative examples only. Use them when the corresponding changes actually exist.

Do not create commits for functionality that has not been implemented.

### Example of a bad development history

```text
update
update again
fix
changes
final changes
latest
done
more changes
final version
```

This history is unprofessional because it provides no meaningful account of the implementation.

---

## 17. DEFINITION OF DONE

A development task is complete only when:

- The implementation meets its requirements.
- The repository remains structurally consistent.
- No unrelated files were modified unnecessarily.
- Tests and applicable quality checks have been executed.
- Failures and limitations are reported honestly.
- Documentation has been updated where necessary.
- Dependencies and lockfiles are consistent.
- No secrets or accidental generated artifacts are committed.
- Every commit has a meaningful message.
- Branch and pull-request policies have been followed.
- CI passes for the relevant change, or its failure is explicitly documented.
- The resulting history is clear and useful to another engineer.

A task is not complete merely because the code was written or pushed to GitHub.

---

## 18. FINAL INSTRUCTION

Maintain `GowthamaRaj29/Scrutio` as a professional software engineering repository.

Prioritize:

1. Meaningful and reviewable commit history.
2. Clear branch naming and disciplined branch lifecycle.
3. Small, coherent changes.
4. Reliable automated testing.
5. Secure CI/CD.
6. A clean repository structure.
7. Consistent documentation.
8. Intentional dependency management.
9. Protected stable branches.
10. Zero-cost tooling and deployment wherever feasible.

**Never optimize for commit count, file count, apparent activity, or superficial enterprise complexity. Optimize for correctness, traceability, maintainability, and engineering quality.**