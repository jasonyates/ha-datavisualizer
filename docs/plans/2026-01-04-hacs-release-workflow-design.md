# HACS Release Workflow Design

## Goal

Create GitHub Actions workflows to validate the integration and prepare releases for HACS on merge to main.

## Architecture

Two separate workflows:
- **validate.yml** - Runs on PRs to block merge if validation fails
- **release.yml** - Runs on push to main to create GitHub releases

Versioning is manual - update `manifest.json` version before merging. The release workflow reads this version and creates a tagged release.

## Validation Workflow (validate.yml)

**Triggers:** push, pull_request, workflow_dispatch

**Jobs (parallel):**

1. **hacs** - HACS validation action (`hacs/action@main` with `category: integration`)
2. **hassfest** - Home Assistant's official integration validator
3. **tests** - Run `npm test` in frontend/
4. **build** - Run `npm run build` to verify TypeScript compiles

## Release Workflow (release.yml)

**Trigger:** push to main branch only

**Steps:**
1. Checkout code
2. Extract version from `custom_components/data_visualizer/manifest.json`
3. Check if release tag already exists (skip if so - prevents duplicates)
4. Build frontend (ensures ha-data-visualizer.js is fresh)
5. Create zip of `custom_components/data_visualizer/`
6. Create GitHub release with zip attached, auto-generated release notes

**Permissions:** Requires `contents: write` for creating releases.

## Files to Create

```
.github/
  workflows/
    validate.yml
    release.yml
```

## Design Decisions

- **Manual versioning** - Simple and explicit control over version bumps
- **Skip existing releases** - Allows multiple PRs under same version without errors
- **Ignore package.json version** - Only manifest.json matters for HACS
- **Parallel validation jobs** - Faster feedback on PRs
- **Auto-generated release notes** - Uses PR titles since last release

## References

- [HACS GitHub Action](https://github.com/hacs/action)
- [HACS Publishing Requirements](https://www.hacs.xyz/docs/publish/start/)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)
