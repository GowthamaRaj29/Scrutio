# MANDATORY POLICY: OFFICIAL DOCUMENTATION-FIRST DEVELOPMENT

## 1. Core Rule

**Before implementing, installing, configuring, importing, or using any technology, library, framework, SDK, API, database feature, or development tool, you MUST consult its latest applicable official documentation.**

Do not rely solely on:
- Your pretrained knowledge.
- Documentation remembered from previous projects.
- Old tutorials, blog posts, or YouTube videos.
- Outdated code examples.
- AI-generated recommendations.
- Package descriptions without checking their official documentation.
- API examples copied from the master specification without verification.

Your knowledge may be outdated. Treat the official documentation and current compatibility information as the authoritative technical reference.

This policy applies throughout the entire project, including initial implementation, debugging, dependency upgrades, security fixes, and deployment.

## 2. Mandatory Research Workflow

Before using any technology or dependency, follow this workflow:

### Step 1: Identify the technology

Determine the exact:
- Library or framework.
- Required feature or API.
- Installed or proposed version.
- Runtime and platform.
- Compatibility requirements.
- Intended use within Scrutio Investigator.

### Step 2: Locate its official website

Use the vendor's official website, official documentation, or official repository.

Examples:

| Technology | Official documentation |
|---|---|
| React | https://react.dev/ |
| TypeScript | https://www.typescriptlang.org/docs/ |
| Node.js | https://nodejs.org/docs/latest/api/ |
| Express | https://expressjs.com/ |
| PostgreSQL | https://www.postgresql.org/docs/ |
| TanStack Query | https://tanstack.com/query/latest |
| Zod | https://zod.dev/ |
| Google GenAI SDK | https://ai.google.dev/gemini-api/docs/libraries |
| Gemini models | https://ai.google.dev/gemini-api/docs/models |
| Gemini deprecations | https://ai.google.dev/gemini-api/docs/deprecations |
| Google GenAI API | https://ai.google.dev/gemini-api/docs |
| npm | https://docs.npmjs.com/ |
| Docker | https://docs.docker.com/ |
| GitHub Actions | https://docs.github.com/en/actions |
| OWASP | https://owasp.org/www-project-application-security-verification-standard/ |

These are starting points, not an exhaustive list. Identify and consult the official documentation for every additional dependency actually selected.

### Step 3: Read the relevant documentation

Do not merely open the homepage.

Find and study the documentation relevant to the feature being implemented.

Depending on the technology, this may include:

- Installation and setup.
- Current stable API references.
- Migration guides.
- Version-specific documentation.
- Configuration.
- Authentication and authorization.
- Error handling.
- Performance recommendations.
- Security guidance.
- Deprecation notices.
- End-of-life announcements.
- Known compatibility limitations.
- Official examples.
- Release notes.

For breaking changes, consult the migration guide for the relevant version transition.

For security-sensitive implementations, read the official security guidance before writing the code.

### Step 4: Verify current support status

Confirm that the selected version and API are currently supported and appropriate for the project.

Check:

1. Latest stable release.
2. Supported runtime versions.
3. Deprecated APIs.
4. End-of-life status.
5. Known security vulnerabilities.
6. Compatibility with existing dependencies.
7. Breaking changes.
8. Whether the documented API is available in the version actually installed.

Do not automatically choose the newest release if it is incompatible with the existing stack. Select the newest suitable, supported, stable version that satisfies the project's requirements.

If a package is in maintenance mode but remains officially supported and is the best compatible choice, document the trade-off rather than incorrectly labelling it deprecated.

### Step 5: Implement according to the documentation

Use the documented APIs and recommended implementation patterns for the selected version.

Do not mix examples from different major versions.

Do not invent API methods, configuration options, package exports, command-line flags, or SDK behavior.

When the documentation is ambiguous, inspect official examples or the corresponding official source code and tests.

### Step 6: Verify the implementation

After implementation:

- Check that the required package version is installed.
- Verify that imported symbols exist.
- Run TypeScript type checking.
- Run linting.
- Execute relevant unit and integration tests.
- Confirm that the actual runtime behavior matches the documented behavior.
- Update the dependency audit and requirement traceability records.

Documentation research is not complete until the resulting implementation has been verified.

---

## 3. Official Sources Take Priority

When sources disagree, use this priority order:

1. Current official documentation for the exact supported version.
2. Official migration guides and release notes.
3. Official security advisories and deprecation notices.
4. Official repository source code, issues, and release discussions.
5. Official package registry metadata.
6. Reputable third-party technical sources as supplementary evidence.

Do not let a third-party tutorial override current official documentation.

If official sources conflict, investigate the version, release date, and context. Record the resolution in `DEPENDENCY_AUDIT.md` or an architecture decision record.

If you cannot verify an important API or compatibility requirement, mark it UNVERIFIED and investigate further before using it in a critical production path.

Never invent a documentation URL or claim to have consulted a page you did not access.

---

## 4. Mandatory Dependency Verification

Before adding or upgrading any dependency:

1. Identify the official documentation and repository.
2. Verify the package name to avoid typosquatting or similarly named packages.
3. Verify the current stable release.
4. Review package maintenance and security status.
5. Confirm runtime compatibility.
6. Review peer dependencies.
7. Inspect breaking changes.
8. Confirm that the package solves a real project requirement.
9. Prefer an existing supported dependency when it already provides the required functionality.
10. Install the selected version using the project's established package manager.
11. Update the lockfile.
12. Run the relevant checks.

Never install a dependency just because an AI recommendation or old tutorial mentions it.

Never use a deprecated API when a supported replacement exists.

Do not automatically upgrade every dependency to its newest version. Evaluate compatibility and migration risks first.

For a major-version upgrade, inspect the official migration guide, update the implementation, and run the full relevant test suite.

---

## 5. Special Rules for Google Gemini

The master specification may contain examples written for older Gemini APIs or SDK versions.

Before implementing or modifying any AI integration:

1. Read the current official Google GenAI SDK documentation.
2. Verify the currently supported JavaScript/TypeScript SDK.
3. Verify the selected model's current availability and lifecycle.
4. Check supported structured-output capabilities.
5. Verify request configuration and schema support for the exact SDK version.
6. Check token counting and usage metadata capabilities.
7. Verify timeout, cancellation, and retry behavior rather than assuming the SDK implements them.
8. Review rate limits and error handling.
9. Confirm that the chosen model satisfies the product's reasoning, latency, and cost requirements.
10. Record the SDK version, model identifier, documentation references, and selection rationale.

Use `@google/genai` if it remains the officially supported SDK for the selected implementation.

Do not copy obsolete model identifiers or APIs from older examples.

Keep the model identifier configurable. Before a model change, verify its availability and compatibility against the official documentation.

---

## 6. Documentation Must Be Version-Aware

The latest documentation may describe APIs that are unavailable in the version installed in the repository.

Therefore:

- Determine the installed version.
- Find the documentation applicable to that version.
- Use current documentation to identify supported upgrade paths.
- Read the migration guide before adopting newer APIs.
- Avoid mixing incompatible version-specific examples.
- Upgrade when beneficial and safe.
- Test all relevant functionality after an upgrade.

If the installed version is deprecated or unsupported, replace it with an appropriate supported version unless a documented compatibility constraint prevents the change.

If an upgrade is blocked, document the exact reason, the affected functionality, the security implications, and the remediation plan.

---

## 7. Maintain a Documentation Research Ledger

Create or maintain:

`docs/implementation/OFFICIAL_DOCUMENTATION_AUDIT.md`

For each important technology or integration, record:

| Field | Required information |
|---|---|
| Technology | Library, framework, API, or service |
| Project usage | The feature being implemented |
| Official documentation | Exact documentation page consulted |
| Documentation version | Version or release context, when available |
| Installed version | Actual version in the project |
| Selected version | Version chosen for implementation |
| Support status | Supported, deprecated, end-of-life, or unverified |
| Compatibility | Runtime and dependency compatibility |
| Security review | Relevant security guidance and findings |
| Implementation decision | Selected API or approach |
| Verification | Commands and tests used to validate it |
| Date checked | Date the documentation was consulted |

Include references to relevant migration guides and security advisories where applicable.

Do not create fake audit entries. Record only sources actually consulted and checks actually performed.

Prioritize detailed records for major dependencies, security-sensitive APIs, database access, authentication, payment integrations, and AI SDKs. For minor dependencies, maintain an appropriate inventory without creating unnecessary documentation overhead.

---

## 8. Research Efficiently Without Sacrificing Correctness

Do not waste time repeatedly researching the same unchanged dependency.

Maintain the documentation research ledger and reuse verified information when:

- The package version has not changed.
- The implementation uses the same API.
- No relevant deprecation, security, or compatibility change has occurred.
- The existing reference is sufficient for the current task.

Research again when:

- Adding a new dependency.
- Changing a major or minor version where relevant.
- Using a previously unverified API.
- Encountering an unexpected runtime behavior.
- Investigating a security vulnerability.
- Upgrading a framework or runtime.
- Implementing a new integration.
- The official documentation indicates a relevant change.

For rapidly changing APIs and services, verify the current documentation immediately before implementation.

---

## 9. Enforcement Rules

The following are prohibited:

- Implementing a new integration from memory without checking its documentation.
- Claiming a library is current without verifying its support status.
- Using deprecated methods because they appear in the specification.
- Guessing package versions.
- Guessing API parameters or response formats.
- Using obsolete configuration formats.
- Ignoring official migration instructions.
- Suppressing errors caused by incompatible dependencies.
- Claiming documentation was reviewed when it was not.
- Marking a feature COMPLETE when the implementation is unverified.

If a violation is discovered, stop the affected implementation, consult the official documentation, correct the code, and run the appropriate checks.

## 10. Required Behavior Before Every Implementation Phase

Before beginning each phase:

1. Identify the technologies and APIs involved.
2. Review existing documentation audit entries.
3. Research any new or changed technologies.
4. Confirm compatibility and support status.
5. Update the audit where necessary.
6. Implement using verified APIs.
7. Test the implementation.
8. Record the evidence.

Apply this policy to frontend, backend, database, AI, caching, testing, security, deployment, observability, and CI/CD.

**Final rule: No technology is approved for use merely because it is listed in the specification. It must also be verified against the relevant official documentation, current support status, compatibility requirements, and actual project needs.**