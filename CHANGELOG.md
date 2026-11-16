# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com), and this project adheres to
[Semantic Versioning](https://semver.org).

## [Unreleased]

### Fixed
- Restore uploads awaiting on-device confirmation are shown as staged, not completed; instructions explain how to confirm or cancel using OLED or serial.
- An already-pending restore no longer triggers a device-mismatch prompt or forced re-upload.
- Invalid JSON and explicit error responses no longer appear as successful restores. Immediate-success responses from older firmware remain supported.

### Added
- Dependency-free restore-response tests, with an optional check against the firmware checkout's staged-restore response contract.

## [1.0.3] — 2026-07-19

Understand field-level `encryptedFields` from firmware backup export.

### Changed
- Parse `encryptedFields` as either whole-file paths (`/system/certs/…`) or
  nested paths (`/system/settings.json:network.wifi.networks[0].password`).
  Older stub entries (`wifiNetworks[].password`, wildcards) are ignored.
- Inspect/preview lists device-bound secrets and tags files that contain them
  (`N secret(s)`), not only wholly encrypted cert files.
- Cross-device import warnings/confirmations call out nested secrets that will
  be cleared inside transferable files (settings, ESP-NOW JSON, etc.).

## [1.0.2] — 2026-07-19

Align backup contents UI/docs with the firmware settings/debug split.

### Changed
- **System Settings** export now documents `/system/debug.json` alongside
  `settings.json` (firmware already bundles both under the `settings` category).
- **User Accounts** export now documents `/system/boot_anchors.json`
  (firmware already includes it with the `users` category).
- Inspect/preview labels recognize `debug.json` and `boot_anchors.json`.
- `BACKUP_CATEGORIES` includes `certs` so it matches the export checkboxes.

## [1.0.1] — 2026-06-28

Clearer admin-only backup feedback and a fix for encrypted-MAC display.

### Changed
- Export now reports **"Admin access required"** when the device rejects a
  non-admin backup (HTTP 403), instead of a generic "Device returned HTTP 403."
  Pairs with the firmware now restricting `/api/backup` to admin accounts.

### Fixed
- Inspect/preview: long AES-encrypted MAC values (mesh peers and ESP-NOW
  devices) now wrap instead of overflowing past the edge of their card.

## [1.0.0] — 2026-03-15

Initial release — a single-file, in-browser tool to back up, restore, and
inspect HardwareOne ESP32 device configuration across firmware updates.

### Added
- **Export** — connect to a running device and download its full configuration
  as a `.hwbackup` file: system settings, user accounts, automations, ESP-NOW
  config, maps & waypoints, and certificates.
- **Import** — restore a backup to a freshly-flashed device during first-time
  setup, with selective (per-file) restore.
- **Inspect** — open a `.hwbackup` offline to review device info, the file list,
  and decoded users / automations / peers.
- Certificate backup for HTTPS and MQTT, encrypted with the device's hardware
  key so secrets aren't stored in plaintext and only restore on the same device.
- Device-fingerprint compatibility check, with a forced partial-restore path for
  cross-device transfers.
- Firmware version-compatibility validation with explicit user acknowledgment
  for forward-incompatible restores.
- Light/dark theme; runs 100% client-side with no dependencies.
