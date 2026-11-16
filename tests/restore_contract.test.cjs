'use strict';

// No browser, device, npm packages, or network access needed:
//   node --test tests/restore_contract.test.cjs
// Optional firmware boundary check:
//   HW1_FIRMWARE_ROOT=/path/to/hardwareone-idf node --test tests/restore_contract.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match, index) => new vm.Script(match[1], { filename: `index.html:inline-${index + 1}` }));

function element() {
    const classes = new Set();
    const attributes = new Map();
    const el = {
        textContent: '', className: '', style: {}, value: '', dataset: {},
        disabled: false, checked: false, children: [], scrollTop: 0, scrollHeight: 0,
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            contains: name => classes.has(name),
            toggle(name, force) {
                const enabled = force === undefined ? !classes.has(name) : force;
                if (enabled) classes.add(name); else classes.delete(name);
                return enabled;
            }
        },
        setAttribute: (name, value) => attributes.set(name, value),
        getAttribute: name => attributes.get(name),
        addEventListener() {},
        appendChild(child) { this.children.push(child); },
        removeChild(child) { this.children = this.children.filter(item => item !== child); }
    };
    Object.defineProperty(el, 'innerHTML', {
        get() { return this._html || ''; },
        set(value) { this._html = value; this.children = []; }
    });
    return el;
}

const backup = () => ({
    magic: 'HWBACKUP',
    device: { fingerprint: 'source-fixture', firmwareVersion: '1.0.0' },
    files: {
        '/system/settings.json': { literal: 'quotes " slash \\ newline\n', secret: 'AES:fixture' },
        '/system/debug.json': { logLevel: 2 }
    }
});

function harness(replies, options = {}) {
    const queue = [...replies];
    const elements = new Map();
    const requests = [];
    const prompts = [];
    const get = id => {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
    };
    get('importDeviceIp').value = 'http://device.invalid';
    const selected = (options.selected || []).map(filePath => ({ dataset: { path: filePath } }));
    const context = vm.createContext({
        document: {
            documentElement: element(), body: element(), getElementById: get,
            createElement: element,
            querySelectorAll: selector => selector === '#importToggles input[type="checkbox"]:checked' ? selected : []
        },
        window: { matchMedia: () => ({ matches: false }) },
        localStorage: { getItem: () => null, setItem() {} },
        console: { log() {}, warn() {}, error() {} },
        AbortController, setTimeout, clearTimeout,
        confirm(message) { prompts.push(message); return options.confirm === true; },
        async fetch(url, request) {
            const reply = queue.shift();
            assert.ok(reply, `Unexpected request: ${url}`);
            assert.equal(url, `http://device.invalid${reply.endpoint || '/api/restore'}`);
            requests.push({ url, request, body: request.body ? JSON.parse(request.body) : null });
            return new Response(reply.raw !== undefined ? reply.raw : JSON.stringify(reply.body), {
                status: reply.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    });
    for (const script of scripts) script.runInContext(context);
    return {
        context, requests, prompts, get,
        text: () => [get('importConnStatus').textContent, ...get('importLog').children.map(row => row.textContent)].join('\n'),
        status: () => get('importConnStatus').textContent,
        setBackup(value) {
            context.fixtureBackup = value;
            vm.runInContext('importBackupData = fixtureBackup;', context);
        },
        assertConsumed: () => assert.equal(queue.length, 0, 'Expected response was not requested')
    };
}

function assertNotApplied(h) {
    assert.doesNotMatch(h.text(), /restore complete|data restored|credentials were skipped|\d+ file\(s\) written|will reboot/i);
}

function assertPending(h) {
    assert.match(h.status(), /stag|pending|confirm/i);
    assert.match(h.text(), /device|OLED|serial/i);
    assert.doesNotMatch(h.get('importConnStatus').className, /success/);
    assert.notEqual(h.get('importProgressFill').style.width, '100%');
    assertNotApplied(h);
}

test('all inline page scripts parse and initialize against a minimal DOM', () => {
    assert.ok(scripts.length >= 2);
    const h = harness([]);
    assert.equal(typeof h.context.sendRestore, 'function');
    assert.equal(typeof h.context.startImport, 'function');
});

for (const reply of [
    { name: '202 same-device', status: 202, body: { success: true, pendingConfirm: true, compatible: true } },
    { name: '202 cross-device', status: 202, body: { success: true, pendingConfirm: true, compatible: false, credentialsSkipped: true } },
    { name: '202 without pending flag', status: 202, body: { success: true } },
    { name: '200 with pending flag', status: 200, body: { success: true, pendingConfirm: true } },
    { name: '409 already staged', status: 409, body: { error: 'Confirm pending', pendingConfirm: true, message: 'Confirm or cancel on the device.' } },
    { name: '409 pending takes precedence over mismatch', status: 409, body: { error: 'Device mismatch', compatible: false, pendingConfirm: true } }
]) {
    test(`${reply.name}: wait for on-device confirmation without applying or forcing`, async () => {
        const h = harness([reply], { confirm: true });
        await h.context.sendRestore(backup(), false);
        assertPending(h);
        assert.equal(h.prompts.length, 0);
        assert.equal(h.requests.length, 1);
        assert.equal(h.requests[0].body.force, undefined);
        h.assertConsumed();
    });
}

for (const body of [
    { reason: 'different_device', message: 'Different device.' },
    { compatible: false, message: 'Different device.' },
    { error: 'Device mismatch' }
]) {
    test(`explicit mismatch ${JSON.stringify(body)} can be cancelled without resending`, async () => {
        const h = harness([{ status: 409, body }]);
        await h.context.sendRestore(backup(), false);
        assert.equal(h.prompts.length, 1);
        assert.equal(h.requests.length, 1);
        assert.match(h.status(), /cancel/i);
        assertNotApplied(h);
    });
}

test('confirmed cross-device retry preserves selected data and can end staged', async () => {
    const payload = backup();
    const original = structuredClone(payload);
    const h = harness([
        { status: 409, body: { reason: 'different_device', compatible: false } },
        { status: 202, body: { success: true, pendingConfirm: true, compatible: false, credentialsSkipped: true } }
    ], { confirm: true });
    await h.context.sendRestore(payload, false);
    assert.equal(h.prompts.length, 1);
    assert.equal(h.requests.length, 2);
    assert.deepEqual(h.requests[0].body, original);
    assert.deepEqual(h.requests[1].body, { ...original, force: true });
    for (const { request } of h.requests) {
        assert.equal(request.method, 'POST');
        assert.equal(request.headers['Content-Type'], 'application/json');
        assert.equal(request.headers.Authorization, undefined, 'Setup restore does not use export credentials');
    }
    assertPending(h);
    h.assertConsumed();
});

for (const reply of [
    { name: '200 explicit error', status: 200, body: { error: 'Filesystem not ready' } },
    { name: '200 explicit failure', status: 200, body: { success: false, message: 'Write failed' } },
    { name: '200 ambiguous empty object', status: 200, body: {} },
    { name: '200 invalid negative filesWritten', status: 200, body: { filesWritten: -1 } },
    { name: '200 invalid string filesWritten', status: 200, body: { filesWritten: '2' } },
    { name: '202 explicit error', status: 202, body: { error: 'Staging failed' } },
    { name: '200 malformed JSON', status: 200, raw: 'not JSON' },
    { name: '200 empty body', status: 200, raw: '' },
    { name: '200 null', status: 200, body: null },
    { name: '200 array', status: 200, body: [] },
    { name: '200 string', status: 200, body: 'success' },
    { name: '200 number', status: 200, body: 1 },
    { name: '200 boolean', status: 200, body: true },
    { name: '409 unrelated conflict', status: 409, body: { error: 'Busy', message: 'Try later' } },
    { name: '409 malformed JSON', status: 409, raw: 'not JSON' },
    { name: '401 unauthorized', status: 401, body: { error: 'Unauthorized' } },
    { name: '403 setup unavailable', status: 403, body: { error: 'Unavailable' } },
    { name: '404 endpoint unavailable', status: 404, body: { error: 'Not found' } },
    { name: '500 allocation failure', status: 500, body: { error: 'Out of memory' } }
]) {
    test(`${reply.name}: reject without false success or force prompt`, async () => {
        const h = harness([reply], { confirm: true });
        await assert.rejects(() => h.context.sendRestore(backup(), false));
        assert.equal(h.prompts.length, 0);
        assert.equal(h.requests.length, 1);
        assertNotApplied(h);
        assert.doesNotMatch(h.get('importConnStatus').className, /success/);
        h.assertConsumed();
    });
}

for (const body of [
    { success: true, filesWritten: 2, compatible: true },
    { success: true, filesWritten: 1, compatible: false, credentialsSkipped: true },
    { filesWritten: 2 }
]) {
    test(`legacy immediate 200 success remains supported: ${JSON.stringify(body)}`, async () => {
        const h = harness([{ status: 200, body }]);
        await h.context.sendRestore(backup(), false);
        assert.match(h.status(), /restore complete/i);
        assert.match(h.get('importConnStatus').className, /success/);
        assert.equal(h.prompts.length, 0);
        assert.equal(h.requests.length, 1);
        if (body.compatible === false) assert.match(h.status(), /partial/i);
    });
}

test('startImport sends only selected files unchanged after the existing ping', async () => {
    const source = backup();
    const selectedPath = '/system/settings.json';
    const h = harness([
        { endpoint: '/api/ping', status: 200, body: { mode: 'restore', fingerprint: 'target-fixture' } },
        { status: 202, body: { success: true, pendingConfirm: true } }
    ], { selected: [selectedPath] });
    h.setBackup(source);
    await h.context.startImport();
    assert.equal(h.requests.length, 2);
    assert.deepEqual(h.requests[1].body, {
        magic: 'HWBACKUP', device: source.device, files: { [selectedPath]: source.files[selectedPath] }
    });
    assertPending(h);
    assert.equal(h.prompts.length, 0);
    assert.equal(h.get('importStartBtn').disabled, false);
    h.assertConsumed();
});

test('startImport renders a failed error response and re-enables its button', async () => {
    const h = harness([
        { endpoint: '/api/ping', status: 200, body: { mode: 'restore' } },
        { status: 200, body: { error: 'Filesystem not ready' } }
    ], { selected: ['/system/settings.json'] });
    h.setBackup(backup());
    await h.context.startImport();
    assert.match(h.status(), /failed|error/i);
    assert.match(h.get('importConnStatus').className, /error/);
    assert.equal(h.get('importStartBtn').disabled, false);
    assertNotApplied(h);
});

const firmwareRoot = process.env.HW1_FIRMWARE_ROOT;
test('optional current firmware contract includes staged202 and pending409', { skip: !firmwareRoot }, () => {
    const source = fs.readFileSync(path.join(firmwareRoot, 'components/hardwareone/WebServer_MigrationTool.cpp'), 'utf8');
    const handler = source.slice(source.indexOf('static esp_err_t handleRestore('));
    assert.match(handler, /202 Accepted/);
    const pendingConflict = handler.match(/if\s*\(sRestoreAwaitingConfirm\)\s*\{([\s\S]*?)return ESP_OK;/);
    assert.ok(pendingConflict, 'Firmware must retain the explicit already-staged guard');
    assert.match(pendingConflict[1], /409 Conflict/);
    assert.match(pendingConflict[1], /pendingConfirm\\":true/);
    assert.match(handler.slice(handler.indexOf('202 Accepted')), /pendingConfirm\\":true/);
});
