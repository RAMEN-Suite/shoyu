# Contributing to Shoyu

## Start the repository

Shoyu has two packages with their own dependencies: `client/` (Angular) and `server/` (Express API on Neo4j). Install the Node.js version from `.nvmrc`, then set up the repository root once:

```bash
nvm install
npm ci            # commitlint for the commit-msg hook
npm run prepare   # activates .githooks; .npmrc disables install scripts, so npm does not run it for you
```

Clones that used the old husky hook must run `npm run prepare` once as well: their `core.hooksPath` still points at `.husky/_`, which no longer exists, so no hook runs.

The server needs a Neo4j 5 database with APOC and a project. Both come from [ramen-projects](https://github.com/RAMEN-Suite/ramen-projects); clone it next to this repository.

Load a project with its import scripts in `imports/<project>/`, in file order, from the repository root. Then set up the server. The project's configuration lives in `projects/<project>/shoyu/`, in the directories `config`, `i18n`, `markdown` and `assets`:

```bash
cd server
npm ci
cp .env.example .env
```

In `server/.env`, point the database settings at the local database and the four paths (relative to `server/`) at the project you imported:

```bash
NEO4J_HOST="bolt://localhost:7687"
NEO4J_PASSWORD="<password>"
CONFIGURATION_PATH="../../ramen-projects/projects/abbw/shoyu/config"
LANGUAGES_PATH="../../ramen-projects/projects/abbw/shoyu/i18n"
MARKDOWN_PATH="../../ramen-projects/projects/abbw/shoyu/markdown"
ASSETS_PATH="../../ramen-projects/projects/abbw/shoyu/assets"
```

`.env` files stay local. Start the server:

```bash
npm run server:dev     # http://localhost:3000, restarts on changes
```

Start the client in a second terminal:

```bash
cd client
npm ci
npm start              # http://localhost:4200; requests to /api go to the server on port 3000
```

| Directory | Contents                                                                       |
| --------- | ------------------------------------------------------------------------------ |
| `client/` | Angular application; its image serves the build with Caddy                     |
| `server/` | Express API, OpenAPI generator in `server/openapi/`; its image runs on Node.js |
| `schema/` | JSON schemas of the project configuration, shipped in the server image         |

## Branches and commits

```
feature branch  ──►  dev  ──►  main
```

| Branch             | Purpose                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **feature branch** | Where you work. Branched from the latest `dev`, one per change, named after it (`feat/graph-zoom`, `fix/empty-result`).                                                                                 |
| **`dev`**          | Integration branch. Pull requests are squash-merged into it.                                                                                                                                            |
| **`main`**         | Release branch. Maintainers promote `dev` with a merge commit, which releases. Urgent fixes may open a pull request into `main` directly; after every push to `main`, `main` is merged back into `dev`. |

You don't push to `dev` or `main` directly. Write [Conventional Commits](https://www.conventionalcommits.org), on your branch and in the pull request title:

```
type(scope): subject

feat(client): add graph zoom controls
fix(server): handle an empty Neo4j result
docs: expand the local setup instructions
```

| Type                                    | Use for                                                   | In the changelog |
| --------------------------------------- | --------------------------------------------------------- | ---------------- |
| `feat`                                  | A new feature                                             | Yes              |
| `fix`, `perf`                           | A bug fix, a performance improvement                      | Yes              |
| `refactor`, `docs`, `revert`            | Restructuring, documentation, reverting an earlier change | Yes              |
| `build`, `ci`, `chore`, `style`, `test` | Build and Dockerfiles, CI, maintenance, formatting, tests | No               |

The scope is optional and one of `client`, `server`, `deps`, `release`; leave it out for repository-wide changes. Mark a breaking change with `!` after the type or scope: `feat(server)!: require authentication on all endpoints`.

The pull request title becomes the commit on `dev` and the line in the changelog, so make it say what changed. CI lints the title and the commits you push; the commit-msg hook checks them locally. If you are unsure about type or scope, open the pull request anyway and ask.

## Checks

Run these in the package you changed before you push:

| Command          | Checks                                  |
| ---------------- | --------------------------------------- |
| `npm run lint`   | ESLint / `ng lint`                      |
| `npm run format` | Prettier (`npm run format:fix` repairs) |
| `npm run build`  | The package compiles                    |

Every pull request into `dev` or `main` runs the full suite for both packages and both images, whatever you changed:

| Check                            | Fails on                                                                 |
| -------------------------------- | ------------------------------------------------------------------------ |
| PR title                         | A title that is not a Conventional Commit                                |
| Client / Server: lint and format | Lint errors, unformatted files                                           |
| Client / Server: package checks  | A failing `npm run build`                                                |
| Client / Server image            | A failing image build, AGPL licenses in the image                        |
| Supply chain                     | Invalid npm registry signatures, copyleft production dependencies        |
| Vulnerability and secret scan    | Committed secrets (gitleaks); dependency CVEs are reported, not blocking |
| SAST scan, CodeQL                | High-severity findings                                                   |
| Config lint                      | Dockerfile findings (hadolint), misconfigurations (Trivy)                |
| Actions lint                     | Workflow findings (zizmor, actionlint)                                   |

Never commit secrets or `.env` files: the secret scan blocks the pull request, and a leaked secret has to be rotated.

## Dependencies

Renovate opens dependency updates against `dev`, on branches named `deps/…`. Patch updates merge themselves once CI is green; minor and major updates arrive as pull requests. On `main` Renovate only proposes security fixes, as pull requests. The Node.js version in `.nvmrc` and in the Dockerfiles moves as one update. Do not open Dependabot security update PRs from the alerts page.

`.npmrc` in the root, `client/` and `server/` disables install scripts, blocks git and remote dependencies, and sets a three-day release cooldown: a version published less than three days ago cannot enter a lockfile.

Production dependencies must be permissively licensed: CI rejects copyleft licenses (GPL, LGPL, AGPL) in the npm dependencies, and AGPL anywhere in the image (the Alpine base brings GPL system packages, which is fine). Base images are pinned by tag and digest. Alpine packages are pinned by version with a `# renovate:` comment naming the Alpine release of the base image; keep that comment in step when the base image moves to a new Alpine release.

## Releases and deployments

Merging `dev` into `main` releases automatically: the workflow takes the version from the commits since the last release, updates `CHANGELOG.md`, tags `vX.Y.Z`, builds and publishes the client and server images, and deploys them to the production servers. While Shoyu is below `1.0.0`, a breaking change bumps the minor version and every other change the patch version; from `1.0.0` on, breaking changes bump the major and `feat` the minor version.

Every push to `dev` builds images tagged `dev` and `sha-<commit>` and deploys them for testing. A deployment waits until the containers are healthy and rolls back otherwise.

## Review checklist

- Explain the problem and the resulting behavior.
- Call out configuration, schema, API, dependency and deployment changes.
- Include screenshots when the client changes visibly.
- Keep unrelated refactors out of the change.
- Do not commit build output, generated reports or local configuration.

Contributions are licensed under the repository's [Apache License 2.0](LICENSE).
