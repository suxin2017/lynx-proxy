---
name: release
description: 'Publish a new release version of Lynx Proxy. Use when: user says "publish", "release", "发版", "发布版本", "打 tag", "bump version". Steps: version bump → test & lint → changelog → UI build → schema export → commit → tag → push → trigger CI.'
argument-hint: 'version type: patch | minor | major (default: patch)'
---

# Lynx Proxy Release Process

## When to Use
- User asks to publish a new version / 发布版本
- User asks to bump version / 升级版本
- User asks to trigger CI build / 触发流水线构建
- User asks to create a release / 创建 Release

## Prerequisites

- Working directory: `/Users/wx/codes/lynx-proxy`
- Rust toolchain: stable (rustfmt + clippy)
- Installed tools: `cargo-release`, `git-cliff`, `task`
- UI dependencies: `npm ci` in `ui/`
- Git: clean working tree (no uncommitted changes)
- All tests pass and linter is clean (see step 2)

## Release Procedure

### 1. Determine Version

Check current version from `Cargo.toml`:
```
workspace.package.version
```

Determine the new version based on changes:
- **patch** (0.8.4 → 0.8.5): Bug fixes only
- **minor** (0.8.4 → 0.9.0): New features, backward compatible
- **major** (0.8.4 → 1.0.0): Breaking changes

### 2. Run Tests & Lint

> ⚠️ Never release without passing tests!

```bash
# Run all workspace tests
cargo test --workspace

# Run clippy linter (deny warnings)
cargo clippy --all-targets --all-features -- -D warnings

# Check formatting
cargo fmt --all -- --check
```

Or use the Taskfile:
```bash
task lint
task test
```

### 3. Update CHANGELOG

Update `CHANGELOG.md`:
- Add a new section `## [<version>] - <YYYY-MM-DD>`
- Group changes under conventional commit categories:
  - `### 🚀 Features`
  - `### 🐛 Bug Fixes`
  - `### ♻️ Refactor`
  - `### 📚 Documentation`
  - `### 🧪 Testing`
  - `### ⚙️ Miscellaneous Tasks`
- Use format: `- *(<scope>)* <description>`

Alternatively, generate from git history:
```bash
git-cliff --unreleased --tag v<version> --prepend CHANGELOG.md
```

### 4. Bump Version (Root Cargo.toml)

Update the `version` field in `Cargo.toml` under `[workspace.package]`:
```
version = "<new_version>"
```

> ⚠️ All sub-crates use `version.workspace = true`, so only the root `Cargo.toml` needs updating.

### 5. Build UI Assets

```bash
cd /Users/wx/codes/lynx-proxy && task build-ui
```

This generates the Vue.js frontend into `crates/lynx-cli/assets/`.

### 6. Export Rules Schema

```bash
cargo run -q -p lynx-cli -- rules schema export --out schemas/rules-export.schema.json
```

### 7. Commit & Tag

```bash
git add -A
git commit -m "chore(release): v<version>"
git tag v<version>
```

### 8. Push to GitHub

```bash
git push origin main
git push origin v<version>
```

This triggers the `Release` GitHub Actions workflow (`.github/workflows/release.yml`), which:
1. Builds the UI assets
2. Runs `cargo-dist` to build binaries for:
   - `aarch64-apple-darwin` (macOS ARM)
   - `x86_64-unknown-linux-gnu` (Linux x86_64)
   - `x86_64-pc-windows-msvc` (Windows x86_64)
3. Creates a GitHub Release with artifacts and installer scripts

### 9. (Optional) Quick Release with cargo-release

For a fully automated flow:

```bash
# Patch release
cargo release patch --execute

# Minor release
cargo release minor --execute

# Major release  
cargo release major --execute
```

This uses the config in `release.toml`:
- Pre-release hook: `task build-ui`
- Pre-tag hook: exports rules schema
- No crates.io publish (`publish = false`)
- Auto-push to git

## Important Notes

- **Tests are mandatory**: The Taskfile release tasks (`release-patch`, `release-minor`, `release-alpha`) all declare `test` as a dependency — they will refuse to run if tests fail.
- **No crates.io publish**: `release.toml` sets `publish = false`. GitHub Actions handles binary distribution.
- **Tag format**: `v<semver>` (e.g., `v0.8.4`), triggers `.github/workflows/release.yml`.
- **Changelog convention**: Keep `CHANGELOG.md` with `## [<version>] - <YYYY-MM-DD>` headers.
- **Commit convention**: Use conventional commits (`feat:`, `fix:`, `chore:`, etc.) for changelog generation.
- **After release**: Verify the GitHub Actions workflow at https://github.com/xin2017338/lynx-proxy/actions.

## Rollback

If something goes wrong after pushing:

```bash
# Delete remote tag
git push --delete origin v<version>

# Delete local tag
git tag -d v<version>

# Revert commit
git revert HEAD
git push origin main
```
