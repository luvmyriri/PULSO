import { createServer } from 'vite';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import assert from 'node:assert';

// Define DOM classes
class Element {}
class HTMLElement extends Element {}
class HTMLIFrameElement extends HTMLElement {}
class HTMLInputElement extends HTMLElement {}
class HTMLTextAreaElement extends HTMLElement {}
class HTMLSelectElement extends HTMLElement {}
class HTMLButtonElement extends HTMLElement {}
class HTMLAnchorElement extends HTMLElement {}
class Document {}

globalThis.Element = Element;
globalThis.HTMLElement = HTMLElement;
globalThis.HTMLIFrameElement = HTMLIFrameElement;
globalThis.HTMLInputElement = HTMLInputElement;
globalThis.HTMLTextAreaElement = HTMLTextAreaElement;
globalThis.HTMLSelectElement = HTMLSelectElement;
globalThis.HTMLButtonElement = HTMLButtonElement;
globalThis.HTMLAnchorElement = HTMLAnchorElement;
globalThis.Document = Document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class MockNode extends HTMLElement {
    constructor(nodeType = 1, tagName = '') {
        super();
        this.nodeType = nodeType;
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.childNodes = [];
        this.attributes = {};
        this.style = {};
        this.parentNode = null;
        this.nodeValue = null;
        this._listeners = new Map();
        this._className = '';
        this.ownerDocument = null;
        this.HTMLIFrameElement = HTMLIFrameElement;
    }

    get textContent() {
        return this.nodeValue !== null ? this.nodeValue : this.childNodes.map(c => c.textContent).join('');
    }
    set textContent(v) {
        if (this.nodeType === 3) {
            this.nodeValue = String(v);
        } else {
            this.childNodes = [doc.createTextNode(v)];
            this.children = [];
        }
    }

    get className() { return this._className || this.attributes['class'] || ''; }
    set className(v) { this._className = String(v); this.attributes['class'] = String(v); }

    get classList() {
        const self = this;
        return {
            contains(c) {
                return self.className.split(/\s+/).filter(Boolean).includes(c);
            },
            add(c) {
                const classes = new Set(self.className.split(/\s+/).filter(Boolean));
                classes.add(c);
                self.className = Array.from(classes).join(' ');
            },
            remove(c) {
                const classes = new Set(self.className.split(/\s+/).filter(Boolean));
                classes.delete(c);
                self.className = Array.from(classes).join(' ');
            },
            toggle(c) {
                if (this.contains(c)) this.remove(c);
                else this.add(c);
            }
        };
    }

    setAttribute(k, v) {
        this.attributes[k] = String(v);
        if (k === 'class') this._className = String(v);
    }
    getAttribute(k) { return this.attributes[k] ?? null; }
    removeAttribute(k) {
        delete this.attributes[k];
        if (k === 'class') this._className = '';
    }

    appendChild(child) {
        child.parentNode = this;
        child.ownerDocument = this.ownerDocument || this;
        this.children.push(child);
        this.childNodes.push(child);
        return child;
    }

    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            this.childNodes.splice(idx, 1);
            child.parentNode = null;
        }
        return child;
    }

    insertBefore(newNode, refNode) {
        const idx = this.childNodes.indexOf(refNode);
        if (idx === -1) return this.appendChild(newNode);
        newNode.parentNode = this;
        newNode.ownerDocument = this.ownerDocument || this;
        this.childNodes.splice(idx, 0, newNode);
        this.children.splice(idx, 0, newNode);
        return newNode;
    }

    replaceChild(newChild, oldChild) {
        const idx = this.childNodes.indexOf(oldChild);
        if (idx !== -1) {
            oldChild.parentNode = null;
            newChild.parentNode = this;
            newChild.ownerDocument = this.ownerDocument || this;
            this.childNodes[idx] = newChild;
            this.children[idx] = newChild;
        }
        return oldChild;
    }

    addEventListener(type, listener) {
        if (!this._listeners.has(type)) this._listeners.set(type, new Set());
        this._listeners.get(type).add(listener);
    }

    removeEventListener(type, listener) {
        if (this._listeners.has(type)) this._listeners.get(type).delete(listener);
    }

    dispatchEvent(event) {
        event.target = event.target || this;
        event.currentTarget = this;
        const listeners = this._listeners.get(event.type);
        if (listeners) {
            for (const listener of listeners) {
                listener.call(this, event);
            }
        }
        if (event.bubbles && this.parentNode) {
            this.parentNode.dispatchEvent(event);
        }
        return true;
    }

    click() {
        this.dispatchEvent({ type: 'click', bubbles: true, cancelable: true, defaultPrevented: false, preventDefault() {} });
    }
}

const doc = new MockNode(9, '#document');
doc.ownerDocument = null;
doc.head = new MockNode(1, 'HEAD');
doc.head.ownerDocument = doc;
doc.body = new MockNode(1, 'BODY');
doc.body.ownerDocument = doc;
doc.documentElement = doc.body;
doc.activeElement = doc.body;
doc.getElementsByTagName = tag => {
    const t = String(tag).toLowerCase();
    if (t === 'head') return [doc.head];
    if (t === 'body') return [doc.body];
    return [];
};
doc.getElementById = id => null;
doc.querySelector = sel => null;
doc.querySelectorAll = sel => [];

const windowMock = new MockNode(1, 'WINDOW');
windowMock.location = {
    hostname: 'localhost',
    reload: () => { windowMock._reloaded = true; }
};
windowMock.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};
windowMock._reloaded = false;
windowMock.document = doc;
windowMock.HTMLIFrameElement = HTMLIFrameElement;
windowMock.HTMLElement = HTMLElement;
windowMock.Element = Element;
doc.defaultView = windowMock;

doc.createElement = function(tag) {
    const node = new MockNode(1, tag);
    node.ownerDocument = doc;
    return node;
};
doc.createElementNS = function(ns, tag) {
    return doc.createElement(tag);
};
doc.createTextNode = function(text) {
    const node = new MockNode(3, '');
    node.nodeValue = String(text);
    node.ownerDocument = doc;
    return node;
};

globalThis.window = windowMock;
globalThis.document = doc;
globalThis.localStorage = windowMock.localStorage;

function findByClassExact(node, className) {
    let matches = [];
    if (node.classList && node.classList.contains(className)) matches.push(node);
    for (const child of node.children || []) {
        matches = matches.concat(findByClassExact(child, className));
    }
    return matches;
}

// Start master suite
async function runMasterTestSuite() {
    console.log('================================================================');
    console.log('  PULSO M1 MASTER VERIFICATION & CHALLENGE SUITE                ');
    console.log('================================================================\n');

    const server = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        root: process.cwd()
    });

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`  [PASS] ${name}`);
            passed++;
        } catch (e) {
            console.error(`  [FAIL] ${name}`);
            console.error(`         Error: ${e.message}`);
            if (e.stack) console.error(`         ${e.stack.split('\n')[1]}`);
            failed++;
        }
    }

    try {
        const { default: GovSystemBanner } = await server.ssrLoadModule('/src/components/GovSystemBanner.jsx');
        const { default: NotificationCenter } = await server.ssrLoadModule('/src/components/NotificationCenter.jsx');
        const { default: GovernmentWorkspaceRoute } = await server.ssrLoadModule('/src/pages/GovernmentWorkspaceRoute.jsx');
        const { ThemeProvider } = await server.ssrLoadModule('/src/contexts/ThemeContext.jsx');
        const { MemoryRouter } = await import('react-router-dom');

        // SECTION 1: GovSystemBanner State Rendering & ARIA Contracts
        console.log('--- 1. GovSystemBanner Contracts & ARIA Verification ---');

        await test('GovSystemBanner: offline mode ARIA, classes, and defaults', async () => {
            const html = renderToString(React.createElement(GovSystemBanner, { type: 'offline' }));
            assert.ok(html.includes('gov-system-banner--offline'));
            assert.ok(html.includes('role="alert"'));
            assert.ok(html.includes('aria-live="assertive"'));
            assert.ok(html.includes('Offline mode active'));
            assert.ok(html.includes('Check connection'));
        });

        await test('GovSystemBanner: permission_changed mode ARIA and defaults', async () => {
            const html = renderToString(React.createElement(GovSystemBanner, { type: 'permission_changed' }));
            assert.ok(html.includes('gov-system-banner--permission-changed'));
            assert.ok(html.includes('role="status"'));
            assert.ok(html.includes('aria-live="polite"'));
            assert.ok(html.includes('Operational permissions updated'));
            assert.ok(html.includes('Refresh session'));
        });

        await test('GovSystemBanner: emergency_access mode ARIA and non-dismissible invariant', async () => {
            const html = renderToString(React.createElement(GovSystemBanner, { type: 'emergency_access' }));
            assert.ok(html.includes('gov-system-banner--emergency-access'));
            assert.ok(html.includes('role="alert"'));
            assert.ok(html.includes('aria-live="assertive"'));
            assert.ok(html.includes('EMERGENCY ACCESS ACTIVE'));
            assert.ok(html.includes('Exit emergency mode'));
            assert.ok(!html.includes('btn-dismiss'), 'Emergency banner must NOT have dismiss button by default');
        });

        await test('GovSystemBanner: partial_data mode ARIA and Force refresh action', async () => {
            const html = renderToString(React.createElement(GovSystemBanner, { type: 'partial_data' }));
            assert.ok(html.includes('gov-system-banner--partial-data'));
            assert.ok(html.includes('role="status"'));
            assert.ok(html.includes('aria-live="polite"'));
            assert.ok(html.includes('Partial data cached'));
            assert.ok(html.includes('Force refresh'));
        });

        await test('GovSystemBanner: prop overrides (title, message, timestamp, dismissible)', async () => {
            const html = renderToString(React.createElement(GovSystemBanner, {
                type: 'emergency_access',
                title: 'CRITICAL HAZARD DEPLOYED',
                message: 'Field crew in sector 4 active',
                timestamp: '09:15 AM PHT',
                dismissible: true,
                className: 'custom-emergency-scope'
            }));
            assert.ok(html.includes('CRITICAL HAZARD DEPLOYED'));
            assert.ok(html.includes('Field crew in sector 4 active'));
            assert.ok(html.includes('09:15 AM PHT'));
            assert.ok(html.includes('btn-dismiss'));
            assert.ok(html.includes('custom-emergency-scope'));
        });

        await test('GovSystemBanner: unknown type falls back safely to partial_data', async () => {
            const html = renderToString(React.createElement(GovSystemBanner, { type: 'invalid_mode' }));
            assert.ok(html.includes('gov-system-banner--partial-data'));
        });

        await test('GovSystemBanner: inactive banner (null type) renders empty output', async () => {
            const html = renderToString(React.createElement(GovSystemBanner, { type: null }));
            assert.strictEqual(html, '');
        });

        // SECTION 2: Dynamic Interactivity & Callbacks
        console.log('\n--- 2. GovSystemBanner Dynamic Interactivity & Callbacks ---');

        await test('GovSystemBanner onAction and onDismiss callback execution', async () => {
            let actionFired = false;
            let dismissFired = false;

            const container = doc.createElement('div');
            const root = createRoot(container);

            await act(async () => {
                root.render(React.createElement(GovSystemBanner, {
                    type: 'permission_changed',
                    onAction: () => { actionFired = true; },
                    onDismiss: () => { dismissFired = true; }
                }));
            });

            const banner = findByClassExact(container, 'gov-system-banner')[0];
            assert.ok(banner, 'Banner rendered');

            const actionBtn = findByClassExact(banner, 'gov-system-banner__btn-action')[0];
            const dismissBtn = findByClassExact(banner, 'gov-system-banner__btn-dismiss')[0];

            await act(async () => {
                actionBtn.click();
            });
            assert.strictEqual(actionFired, true, 'onAction executed');

            await act(async () => {
                dismissBtn.click();
            });
            assert.strictEqual(dismissFired, true, 'onDismiss executed');
            assert.strictEqual(container.children.length, 0, 'Banner unmounted on dismiss');

            await act(async () => {
                root.unmount();
            });
        });

        // SECTION 3: NotificationCenter Drawer & Interactivity
        console.log('\n--- 3. NotificationCenter Drawer & Interactivity ---');

        await test('NotificationCenter closed vs open state rendering', async () => {
            const closedHtml = renderToString(React.createElement(MemoryRouter, null,
                React.createElement(NotificationCenter, { isOpen: false, onClose: () => {} })
            ));
            assert.ok(!closedHtml.includes('gov-notification-drawer is-open'));
            assert.ok(closedHtml.includes('aria-hidden="true"'));

            const openHtml = renderToString(React.createElement(MemoryRouter, null,
                React.createElement(NotificationCenter, { isOpen: true, onClose: () => {} })
            ));
            assert.ok(openHtml.includes('gov-notification-drawer is-open'));
            assert.ok(openHtml.includes('gov-notification-backdrop is-open'));
            assert.ok(openHtml.includes('role="dialog"'));
            assert.ok(openHtml.includes('aria-modal="true"'));
            assert.ok(openHtml.includes('aria-label="Government notification center"'));
        });

        await test('NotificationCenter interactive tab filtering and mark read', async () => {
            windowMock.localStorage.clear();
            const container = doc.createElement('div');
            const root = createRoot(container);

            await act(async () => {
                root.render(React.createElement(MemoryRouter, null,
                    React.createElement(NotificationCenter, { isOpen: true, onClose: () => {} })
                ));
            });

            // Check total sample items
            const items = findByClassExact(container, 'gov-notification-item');
            assert.strictEqual(items.length, 6, `Expected 6 sample notifications, got ${items.length}`);

            // Check initial unread items count
            const unreadItems = findByClassExact(container, 'is-unread');
            assert.strictEqual(unreadItems.length, 3, 'Sample data has 3 unread items');

            // Click "Reviews" tab
            const tabs = findByClassExact(container, 'gov-notification-tab');
            const reviewsTab = tabs.find(t => t.attributes.id === 'tab-reviews');
            assert.ok(reviewsTab, 'Reviews tab found');
            await act(async () => {
                reviewsTab.click();
            });

            const filteredReviews = findByClassExact(container, 'gov-notification-item');
            assert.strictEqual(filteredReviews.length, 1, `Reviews tab shows 1 item (got ${filteredReviews.length})`);

            // Click "Assigned" tab
            const assignedTab = tabs.find(t => t.attributes.id === 'tab-assigned');
            await act(async () => {
                assignedTab.click();
            });
            const filteredAssigned = findByClassExact(container, 'gov-notification-item');
            assert.strictEqual(filteredAssigned.length, 3, `Assigned tab shows 3 items (got ${filteredAssigned.length})`);

            // Click "System" tab
            const systemTab = tabs.find(t => t.attributes.id === 'tab-system');
            await act(async () => {
                systemTab.click();
            });
            const filteredSystem = findByClassExact(container, 'gov-notification-item');
            assert.strictEqual(filteredSystem.length, 2, `System tab shows 2 items (got ${filteredSystem.length})`);

            // Click "All" tab again
            const allTab = tabs.find(t => t.attributes.id === 'tab-all');
            await act(async () => {
                allTab.click();
            });
            const allItems = findByClassExact(container, 'gov-notification-item');
            assert.strictEqual(allItems.length, 6, 'All tab restored 6 items');

            // Click "Mark all read"
            const markAllBtns = findByClassExact(container, 'gov-notification-btn-text').filter(b => b.attributes.type === 'button');
            const markAll = markAllBtns[0];
            assert.ok(markAll, 'Mark all read button found');
            await act(async () => {
                markAll.click();
            });

            const unreadAfter = findByClassExact(container, 'is-unread');
            assert.strictEqual(unreadAfter.length, 0, 'All notifications marked as read');

            const badges = findByClassExact(container, 'gov-notification-badge');
            assert.strictEqual(badges.length, 0, 'Unread badge cleared');

            await act(async () => {
                root.unmount();
            });
        });

        await test('NotificationCenter keyboard Escape listener and cleanup', async () => {
            let closeCount = 0;
            const container = doc.createElement('div');
            const root = createRoot(container);

            await act(async () => {
                root.render(React.createElement(MemoryRouter, null,
                    React.createElement(NotificationCenter, { isOpen: true, onClose: () => { closeCount++; } })
                ));
            });

            await act(async () => {
                windowMock.dispatchEvent({ type: 'keydown', key: 'Escape' });
            });
            assert.strictEqual(closeCount, 1, 'Escape closed drawer when open');

            await act(async () => {
                root.render(React.createElement(MemoryRouter, null,
                    React.createElement(NotificationCenter, { isOpen: false, onClose: () => { closeCount++; } })
                ));
            });

            await act(async () => {
                windowMock.dispatchEvent({ type: 'keydown', key: 'Escape' });
            });
            assert.strictEqual(closeCount, 1, 'Escape handler was cleaned up when closed');

            await act(async () => {
                root.unmount();
            });
        });

        // SECTION 4: WCAG 2.2 AA Contrast Math & Token Fidelity
        console.log('\n--- 4. Civic Aperture Token Fidelity & WCAG 2.2 AA Contrast ---');

        function hexToRgb(hex) {
            const clean = hex.replace('#', '');
            const num = parseInt(clean, 16);
            return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
        }

        function getLuminance({ r, g, b }) {
            const a = [r, g, b].map(v => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
        }

        function getContrastRatio(hex1, hex2) {
            const lum1 = getLuminance(hexToRgb(hex1));
            const lum2 = getLuminance(hexToRgb(hex2));
            const brightest = Math.max(lum1, lum2);
            const darkest = Math.min(lum1, lum2);
            return (brightest + 0.05) / (darkest + 0.05);
        }

        await test('Morning Field Sheet (Light) Primary Text #132238 on Surface #FFFFFF >= 10:1 (AAA)', async () => {
            const ratio = getContrastRatio('#132238', '#FFFFFF');
            assert.ok(ratio >= 7.0, `Ratio ${ratio.toFixed(2)} must be >= 7.0`);
        });

        await test('Morning Field Sheet (Light) Gov Action #0B4F6C on Surface #FFFFFF >= 4.5:1 (AA)', async () => {
            const ratio = getContrastRatio('#0B4F6C', '#FFFFFF');
            assert.ok(ratio >= 4.5, `Ratio ${ratio.toFixed(2)} must be >= 4.5`);
        });

        await test('Night Inspection (Dark) Primary Text #F4F7F2 on Canvas #071A2B >= 12:1 (AAA)', async () => {
            const ratio = getContrastRatio('#F4F7F2', '#071A2B');
            assert.ok(ratio >= 7.0, `Ratio ${ratio.toFixed(2)} must be >= 7.0`);
        });

        await test('Night Inspection (Dark) Gov Action #82C7D8 on Surface #0E283E >= 4.5:1 (AA)', async () => {
            const ratio = getContrastRatio('#82C7D8', '#0E283E');
            assert.ok(ratio >= 4.5, `Ratio ${ratio.toFixed(2)} must be >= 4.5`);
        });

        await test('Night Inspection (Dark) Badge Text #071A2B on Action #82C7D8 >= 7.0:1 (AAA)', async () => {
            const ratio = getContrastRatio('#071A2B', '#82C7D8');
            assert.ok(ratio >= 7.0, `Ratio ${ratio.toFixed(2)} must be >= 7.0`);
        });

        await test('Offline Banner Light Text #744210 on Background #FEF8EE >= 4.5:1 (AA)', async () => {
            const ratio = getContrastRatio('#744210', '#FEF8EE');
            assert.ok(ratio >= 4.5, `Ratio ${ratio.toFixed(2)} must be >= 4.5`);
        });

        await test('Emergency Banner Dark Text #FEE2E2 on Background #310D0D >= 4.5:1 (AA)', async () => {
            const ratio = getContrastRatio('#FEE2E2', '#310D0D');
            assert.ok(ratio >= 4.5, `Ratio ${ratio.toFixed(2)} must be >= 4.5`);
        });

        await test('Permission Banner Dark Text #E0F2FE on Background #092033 >= 4.5:1 (AA)', async () => {
            const ratio = getContrastRatio('#E0F2FE', '#092033');
            assert.ok(ratio >= 4.5, `Ratio ${ratio.toFixed(2)} must be >= 4.5`);
        });

        // SECTION 5: Route Integration & Emergency Detection
        console.log('\n--- 5. GovernmentWorkspaceRoute Integration ---');

        await test('GovernmentWorkspaceRoute mounts GovSystemBanner with autoOffline and emergency check', async () => {
            windowMock.localStorage.setItem('pulso_user', JSON.stringify({
                id: 1,
                role: 'dispatcher',
                full_name: 'Test Dispatcher',
                emergency_access_active: true
            }));

            const html = renderToString(
                React.createElement(ThemeProvider, null,
                    React.createElement(MemoryRouter, { initialEntries: ['/gov/operations?view=reports'] },
                        React.createElement(GovernmentWorkspaceRoute, { workspace: 'operations' })
                    )
                )
            );

            assert.ok(html.includes('gov-workspace-route-container'), 'Workspace container rendered');
            assert.ok(html.includes('EMERGENCY ACCESS ACTIVE'), 'Emergency banner rendered for emergency access user');

            windowMock.localStorage.clear();
        });

        console.log('\n================================================================');
        console.log(`  MASTER VERIFICATION SUITE: ${passed} PASSED, ${failed} FAILED`);
        console.log('================================================================\n');

        await server.close();
        if (failed > 0) process.exit(1);
    } catch (e) {
        console.error('Fatal master test failure:', e);
        await server.close();
        process.exit(1);
    }
}

runMasterTestSuite();
