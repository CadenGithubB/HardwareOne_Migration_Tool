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
7. Device reboots with all settings restored

### Inspect

1. Switch to the **Inspect** tab
2. Drop any `.hwbackup` file to view its contents
3. See device info, file list, and raw JSON data

## What Gets Backed Up

| Data | File Path | Description |
| ---- | --------- | ----------- |
| System Settings | `/system/settings.json` | WiFi, sensors, debug flags, OLED, LED, etc. |
| User Accounts | `/system/users/users.json` | Usernames, hashed passwords, permissions |
| Automations | `/system/automations.json` | Scheduled and conditional automation rules |
| ESP-NOW Config | `/system/espnow/devices.json` | Paired devices and mesh configuration |
| Maps & Waypoints | `/maps/*.hwmap`, `/maps/*.json` | Map files and saved GPS waypoints |


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
    "/system/users/users.json": { ... },
    "/system/automations.json": { ... }
  }
}
```

## License

MIT License
