# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com), and this project adheres to
[Semantic Versioning](https://semver.org).

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
