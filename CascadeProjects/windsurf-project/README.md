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

This tool runs 100% client-side. No data is collected, no analytics, no external requests. The only network traffic is between your browser and your device's local IP. Hosting on GitHub Pages simply serves the static HTML file — GitHub has no visibility into what the tool does after it loads.

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

## Firmware Requirements

The tool communicates with only 3 endpoints. CORS headers are applied **only to these 3 endpoints** — all other device endpoints remain same-origin only, minimizing attack surface.

### Endpoints

| Endpoint | Method | Auth | CORS | Purpose |
| -------- | ------ | ---- | ---- | ------- |
| `/api/ping` | GET | No | Yes | Connection test. Returns device info (hostname, firmware version). Should include `acceptingRestore: true` when in restore mode. |
| `/api/backup` | POST | Yes | Yes | Export. Receives `{ categories: ["settings", "users", ...] }`, returns the complete `.hwbackup` bundle built server-side. |
| `/api/restore` | POST | No | Yes | Import. Receives the `.hwbackup` payload, writes files, reboots. **Only exists during first-time setup.** |

### `/api/backup` (Authenticated, always available)

- Requires valid credentials (Basic Auth)
- Accepts a JSON body with `{ categories: [...] }` specifying what to include
- Builds and returns the full backup bundle server-side:
  - `settings` — reads `/system/settings.json`
  - `users` — reads `/system/users/users.json`
  - `automations` — reads `/system/automations.json`
  - `espnow` — reads `/system/espnow/devices.json` + peer settings
  - `maps` — reads all `.hwmap` and `.json` files in `/maps/`
- Returns the standard `.hwbackup` JSON format with `magic`, `device`, `files`, and optional `warnings` array
- Categories that don't exist on the device (e.g. no `/maps/` folder) are skipped with a warning, not an error

### `/api/restore` (Unauthenticated, triple-gated)

This endpoint must be protected by 3 gates:

1. **Only registered** when the user selects "Import from Backup" during first-time setup — the endpoint handler is not added to the HTTP server's routing table until that moment
2. **Only active** while `gFirstTimeSetupState == SETUP_IN_PROGRESS` — the handler itself checks this and returns 403 otherwise
3. **Automatically removed** after restore completes — the handler is unregistered from the HTTP server before the device reboots

During normal operation, the endpoint literally does not exist. Probing it returns 404. There is nothing on a blank device to protect, and the backup file itself contains the user accounts needed for future authentication.

### CORS (Only on these 3 endpoints)

Each of these 3 handlers must include CORS headers in their responses:

```c
httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type, Authorization");
```

Each also needs a matching `OPTIONS` preflight handler registered at the same URI:

```c
static esp_err_t handleCorsOptions(httpd_req_t *req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type, Authorization");
    httpd_resp_set_hdr(req, "Access-Control-Max-Age", "86400");
    httpd_resp_send(req, NULL, 0);
    return ESP_OK;
}
```

No other endpoints need CORS. The device's own web UI works fine without it (same origin).

## How It Works

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
