# Contributing to ORA

Thanks for contributing! Here are the important things to know:

- [How you contribute](#how-you-contribute)
- [Branching strategy](#branching-strategy)
- [Pull request titles](#pull-request-titles)
- [Passing CI](#passing-ci)
- [Merging](#merging)
- [How releases work](#how-releases-work)
- [Maintainers: commit schema & local hooks](#maintainers-commit-schema--local-hooks)

---

## How you contribute

You work on a **feature branch** and open a **pull request into `dev`**. You don't push to `dev` or `main` directly (those branches are restricted to maintainers). Because your feature branch is squashed when it merges, the individual commit messages on it don't need to follow any convention. So you can write them however helps you. Only the **PR title** has to be right.

Node is pinned via `.nvmrc`; run `nvm use` to match the version CI uses, then install dependencies in the package you're working on (`client/` or `server/`).

---

## Branching strategy

```
feature branch  ──►  dev  ──►  main
```

| Branch | Purpose |
| --- | --- |
| **feature branch** | Where you work. Branched off `dev`, one per unit of work. Name it after the change, e.g. `feat/graph-zoom` or `fix/empty-result-crash`. |
| **`dev`** | Integration branch. Contributions land here first, via squash-merged pull requests. |
| **`main`** | Release branch. Maintainers promote `dev` into `main`, which produces a versioned, tagged release. |

---

## Pull request titles

**A pull request into `dev` must have a title that follows [Conventional Commits](https://www.conventionalcommits.org/).** A CI check validates it, and a non-conforming title blocks the merge. This is enforced because the title becomes the squashed commit message on `dev` and is read by our release tooling.

The format is:

```
type(scope): subject
```

Examples of good titles:

```
feat(client): add graph zoom controls
fix(server): handle empty Neo4j result set
docs: expand the local setup instructions
```

### Types

| Type | Use for |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `perf` | A performance improvement |
| `refactor` | A change that neither fixes a bug nor adds a feature |
| `revert` | Reverting a previous change |
| `docs` | Documentation only |
| `style` | Formatting / whitespace, no behavior change |
| `test` | Adding or fixing tests |
| `build` | Build system or Dockerfiles |
| `ci` | CI/CD configuration |
| `chore` | Maintenance, tooling, dependency bumps |

The type also drives the next version number: `feat` triggers a minor release, everything else a patch. You don't need to think about versions — just pick the type that honestly describes the change.

### Scopes

The scope (optional) names the area you touched. Allowed scopes:

`client` · `server` · `deps` · `release`

Include one when it clarifies *where* the change lives (`fix(server): …`); omit it for repo-wide changes (`docs: …`).

### Breaking changes

Because a PR title is a single line, signal a breaking change with a `!` after the type/scope:

```
feat(server)!: require authentication on all endpoints
```

---

## Passing CI

When you open a pull request into `dev`, a set of automated checks runs — all of them must pass to merge. Run them locally first; it's faster than round-tripping through CI.

### Run these before you push

From the package you changed (`client/` or `server/`):

```bash
npm run lint         # must pass — blocks the merge
npm run build        # must pass — blocks the merge
npm run format       # must pass — blocks the merge
npm run format:fix   # auto-fix formatting, then re-run the check
```

Only the package you touched is checked: a change under `client/` runs Client CI; a change under `server/` or `schema/` runs Server CI.

### What runs on your PR

| Check | Blocks merge? | Verifies |
| --- | --- | --- |
| PR title | yes | Conventional Commits format |
| Lint (`npm run lint`) | yes | ESLint / `ng lint` is clean |
| Build (`npm run build`) | yes | The package compiles |
| Dependency licenses | yes | No copyleft (GPL / AGPL) production dependencies |
| Secret scan (gitleaks) | yes | No secrets or keys committed |
| SAST (Semgrep) | yes | No high-severity security findings |
| Dockerfile lint (hadolint) | yes | Dockerfile best practices — relevant only if you touch a `Dockerfile` |
| Format (`npm run format`) | yes | Prettier formatting |
| Vulnerability scan (Trivy) | yes | Dependency / filesystem CVEs (CRITICAL / HIGH / MEDIUM) |

### Two things to check before you add a dependency or commit

**Dependencies must be permissively licensed.** CI rejects copyleft licenses (GPL, AGPL) in production dependencies — both in the npm tree and in the built container image. Before adding a dependency, check its license; if it's GPL/AGPL, find an alternative or raise it in the pull request.

**Never commit secrets.** API keys, tokens, private keys, or `.env` contents will be caught by the secret scanner and block your PR — and a leaked secret then has to be rotated. Keep them in environment variables or GitHub Secrets.

---

## Merging

You don't choose how your PR merges, the correct method is enforced per branch, and you'll be offered the right button:

| Merge | Method |
| --- | --- |
| your feature → `dev` | **Squash and merge** (your PR title becomes the commit) |
| `dev` → `main` | **Merge commit** — maintainers only |

For your part, all you do is open the PR with a good title and let a maintainer squash it in.

---

## How releases work

Releases are automatic. When maintainers merge `dev` into `main`, a workflow reads every merged commit since the last release, determines the next version, regenerates `CHANGELOG.md`, tags the release, and publishes it — all from the commit messages, which is to say **from your PR titles.** A clear `fix(server): prevent crash on empty result` becomes a clear changelog line; a vague `fix: stuff` becomes a vague one. That's the whole reason the title check exists.

If you're unsure how to type or scope your change, open the PR anyway and ask — a maintainer will help adjust the title before merge.

---

## Maintainers: commit schema & local hooks

> **This section is only relevant if you have direct push access to `dev` or `main`.** Regular contributors work entirely through pull requests and can ignore everything below — your feature-branch commits are squashed, so they're never checked.

Maintainers who commit directly to `dev` or `main` bypass the squash step, which means those commit messages land in the project and the changelog as-is. They therefore **must** follow the same Conventional Commits schema described above (same types, scopes, and `!`/`BREAKING CHANGE:` for breaking changes).

To catch mistakes locally, the repo ships a [husky](https://typicode.github.io/husky/) `commit-msg` hook. Activate it once, from the repository root:

```bash
npm install
```

The hook validates messages **only when you commit on `dev` or `main`** — it's deliberately skipped on feature branches, since those get squashed. It's a convenience, not a gate: it only helps people who actually commit on those branches, and it can be bypassed with `--no-verify`. The authoritative, non-bypassable checks live in CI.

> **Note on versioning while below `1.0.0`.** The project is in the `0.x` range. Following the semver `^0.x` convention, breaking changes bump the **minor** version (e.g. `0.3.0 → 0.4.0`) rather than the major, until `1.0.0` is cut deliberately.
