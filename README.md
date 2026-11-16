# HardwareOne Migration Tool

A web-based tool to backup and restore device configuration across firmware updates for ESP32 devices running HardwareOne firmware.

## Features

- **Export Backup** — Connect to a running device, download all settings into a single `.hwbackup` file
- **Import Backup** — Restore settings to a freshly-flashed device during first-time setup
- **Inspect File** — View backup contents offline without connecting to a device
- **Selective Restore** — Choose which parts of a backup to restore
- **Version Awareness** — Warns about firmware version mismatches between backup and target device
- **Graceful Degradation** — Missing features (e.g. maps not enabled) are skipped with a warning, not treated as errors
- **No Dependencies** — Single HTML file, runs entirely in your browser

## Privacy

This tool runs 100% client-side. 

## How to Run

Download `index.html` and open it directly in your browser:

```bash
# Clone or download the repository
git clone https://github.com/CadenGithubB/HardwareOne-Migration-Tool.git
cd HardwareOne-Migration-Tool

# Open in browser (macOS)
open index.html

# Or serve locally with Python
python3 -m http.server 8000
# Then visit http://localhost:8000
```

**Important:** This tool must be run locally. The ESP32 device serves HTTP (not HTTPS), so browsers will block requests from HTTPS-hosted pages due to mixed content security policies.

## Usage

### Export (Before Firmware Update)

1. Open `index.html` in any modern browser
2. Enter your device's IP address, username, and password
3. Select which data to include (settings, users, automations, ESP-NOW config, waypoints)
4. Click **Create Backup** — a `.hwbackup` file will be downloaded

### Import (After Firmware Update)

1. Flash the new firmware to your device
2. During first-time setup, select **"Import from Backup"** (3rd option)
3. The device will connect to WiFi and start the restore endpoint
4. Open this tool in your browser and switch to the **Import** tab
5. Enter the device IP shown on the OLED
6. Drop your `.hwbackup` file and click **Restore to Device**
7. On firmware that stages restores, confirm on the device OLED or serial console to apply the backup; uploading alone does not write the files. You can cancel there instead.
8. After confirmation, the device applies the restore and reboots. Older firmware may apply and reboot immediately after upload.

If the tool reports that a backup is already awaiting confirmation, confirm or cancel on the device before sending another. This is not a device mismatch and does not require a forced restore.

### Inspect

1. Switch to the **Inspect** tab
2. Drop any `.hwbackup` file to view its contents
3. See device info, file list, and raw JSON data

## What Gets Backed Up

| Data | File Path | Description |
| ---- | --------- | ----------- |
| System Settings | `/system/settings.json`<br>`/system/debug.json` | WiFi, sensors, OLED, LED, etc. Debug flags live in their own file (bundled with this category). |
| User Accounts | `/system/users/users.json`<br>`/system/users/user_settings/*.json`<br>`/system/boot_anchors.json` | Usernames, hashed passwords, permissions, themes; boot anchors keep pending-user timestamps resolvable |
| Automations | `/system/automations.json` | Scheduled and conditional automation rules |
| ESP-NOW Config | `/system/espnow/devices.json`<br>`/system/espnow/mesh_peers.json` | Paired devices and mesh configuration |
| Maps & Waypoints | `/maps/*.hwmap`<br>`/maps/**/waypoints_*.json` | Map files and saved GPS waypoints |
| Certificates | `/system/certs/*.pem`<br>`/system/certs/*.crt`<br>`/system/certs/*.key` | HTTPS and MQTT certificates and keys |


## What the Backup File Contains

The backup file (`.hwbackup`) is a JSON file containing:

```json
{
  "magic": "HWBACKUP",
  "formatVersion": 1,
  "timestamp": "2025-03-07T12:00:00.000Z",
  "device": {
    "hostname": "hardwareone",
    "firmwareVersion": "1.0.0",
    "board": "XIAO_ESP32S3",
    "mac": "AA:BB:CC:DD:EE:FF"
  },
  "files": {
    "/system/settings.json": { ... },
    "/system/debug.json": { ... },
    "/system/users/users.json": { ... },
    "/system/boot_anchors.json": { ... },
    "/system/automations.json": { ... }
  }
}
```

## Firmware Compatibility and Tests

This tool uses `/api/ping`, `/api/backup`, and `/api/restore`. It does not use the filesystem-listing or `fileread` command APIs. Firmware changes to where those APIs allocate memory do not require a new `.hwbackup` format or listing pagination in this tool.

The restore UI supports both immediate-success responses from older firmware and staged responses (`202` / `pendingConfirm`) from newer firmware. An upload awaiting on-device confirmation is not reported as a completed restore.

Run the dependency-free JavaScript contract tests with Node.js:

```bash
node --test tests/restore_contract.test.cjs
```

To also check the current firmware response contract, point the tests at its checkout:

```bash
HW1_FIRMWARE_ROOT=/path/to/hardwareone-idf node --test tests/restore_contract.test.cjs
```

These tests mock the device responses; a real-device export and confirmed/cancelled restore are still needed before release.

## License

MIT License
