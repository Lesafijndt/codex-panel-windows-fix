# Windows path repair for Codex on Crack panel 0.5.1

An archival patch and verification kit for a Windows path-normalization failure in the installed Codex on Crack panel version 0.5.1. This is not the upstream panel application. No bundled server, UI assets, live configuration, authentication token or snapshot is included.

## Authored scope and provenance

Source workspace: `Documents/Codex/2026-11-04/codex-on-crack-plugin-codex-on/work/panel-windows`.

- `patch.mjs`: guarded exact replacement of the bundled `tn()` and `Wn()` path helpers.
- `verify.mjs`: path-boundary/file checks and a read-only controller snapshot check.
- `verify-http.mjs`: local HTTP/token/origin/header checks.
- `verify-upstream.mjs`: reproduces the original `state_unreadable` behavior on the exact upstream bundle and compares hashes.

The original repair targeted the separately installed **codex-on-crack-panel 0.5.1** plugin. Its runtime was copied locally for verification; that third-party code is deliberately excluded from this repository. Obtain it from your own legitimate installation and retain its license and notices. This archive grants no additional rights to redistribute the upstream bundle. `SOURCE_MANIFEST.json` records the selected authored files.

## Archival status

These scripts depend on private, minified implementation symbols from the exact version above. They are not a general-purpose upgrade and may intentionally reject another bundle. Historical verification reports, session IDs and logs are not included. The checks were not executed during archive preparation.

Sanitization changes are limited to externalizing session IDs/upstream paths and documenting the archive layout. The guarded replacement and security/path assertions are retained.

## Local verification setup

Use Node.js 24 on Windows. No npm dependencies are required. Review all scripts before running them.

1. Copy the exact upstream `server/` directory and `assets/` directory into this archive's root, preserving their structure. Do not copy your configuration or logs from another session.
2. Keep your own panel configuration outside this repository, with launching disabled.
3. Set `PANEL_EXPECTED_SESSION_IDS` to a comma-separated list of registered session IDs expected in your own local configuration. Both snapshot verification scripts require a nonempty list.
4. Run `node patch.mjs`. It edits only the local `server/panel.mjs` copy and fails if the expected original code is absent.
5. Run `node verify.mjs <absolute-path-to-your-local-panel-config.json>`.

For upstream comparison, set `PANEL_UPSTREAM` to the installed **0.5.1** plugin directory and run `node verify-upstream.mjs <absolute-path-to-your-local-panel-config.json>`. This check expects the original failure; a subsequently fixed upstream version is not the same baseline.

For HTTP checks, start the local copied server using its own documented CLI and redirect its stdout to `server.stdout.log` in this directory. Then run `node verify-http.mjs`. That log carries the private token URL. Generated logs, server copies, fixtures and snapshots are ignored and must not be committed.

## Side effects and exclusions

The patch edits a local runtime copy; checks create temporary modules/fixtures and write local reports/snapshots. Verification does not approve reviews, launch models or submit feedback, but the snapshots may contain private workspace/session metadata. Keep all generated evidence local.

Excluded: upstream runtime/UI, live configuration, connection records, session snapshots, PID files, private token logs, fixture directories and historical runtime reports. Do not publish those files merely because the repository is private.
