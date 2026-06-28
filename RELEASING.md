# Releasing

This repo ships as a single `index.html` with no build step. Releases follow
[Keep a Changelog](https://keepachangelog.com) + [Semantic Versioning](https://semver.org):
**every release has BOTH** a `CHANGELOG.md` entry and a matching GitHub Release
with the same notes.

The version lives in two places that must agree (there's no package manifest):
- the git tag `vX.Y.Z`
- the `<!-- HardwareOne Migration Tool — vX.Y.Z -->` comment near the top of `index.html`

Work lands directly on `main` (trunk-based).

## Cut a release

1. **Pick the version** with SemVer vs the last tag: MAJOR = breaking,
   MINOR = backward-compatible features, PATCH = fixes/docs.
2. **Draft notes** from `git log <last-tag>..HEAD --oneline`, grouped into
   Added / Changed / Fixed / Security. Write for someone deciding whether to
   upgrade — what changed and why, not a commit dump.
3. **Bump** the `<!-- … vX.Y.Z -->` comment in `index.html`.
4. **Add** a `## [X.Y.Z] — <date>` section to `CHANGELOG.md`. Get the date from
   `date +%F` — do not guess it.
5. **Commit** (Conventional Commits, e.g. one or more `fix:` / `feat:` content
   commits, then a `chore(release): X.Y.Z` carrying the bump + changelog).
6. **Tag and push:**
   ```
   git tag -a vX.Y.Z -m "vX.Y.Z — <theme>"
   git push origin main --follow-tags
   ```
7. **Create the Release** (notes mirror the CHANGELOG section; attach the single
   file so people can download it without cloning):
   ```
   gh release create vX.Y.Z \
     --title "vX.Y.Z — <theme>" \
     --notes-file notes.md \
     "index.html#HardwareOne Migration Tool (single file)"
   ```
   Use `--notes-file` (NOT `--notes`) so backticks/quotes/apostrophes aren't
   mangled by the shell.
8. **Verify:** `gh release view vX.Y.Z --json tagName,assets,isLatest`; confirm
   the tree is clean and `main` == `origin/main`; report the release URL.

## Guardrails
- Release notes and the changelog are **public** — no secrets, tokens,
  credentials, private IPs/hostnames, internal absolute paths, or personal data.
- This repo has no build artifacts to gitignore; the only attached asset is
  `index.html` itself.
- The tag and the Release are the only outward-facing actions.
