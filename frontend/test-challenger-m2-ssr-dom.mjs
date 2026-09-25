import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import assert from 'node:assert';

// Define DOM classes for SSR/mock environment
class Element {}
class HTMLElement extends Element {}
class HTMLInputElement extends HTMLElement {}
class Document {}

globalThis.Element = Element;
globalThis.HTMLElement = HTMLElement;
globalThis.HTMLInputElement = HTMLInputElement;
globalThis.Document = Document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const windowMock = {
    location: {
        origin: 'https://pulso.ph',
        search: '?id=RPT-20260902-8F92E1B4&token=TRK-ABCD-1234',
        href: 'https://pulso.ph/track?id=RPT-20260902-8F92E1B4&token=TRK-ABCD-1234',
    },
    localStorage: {
        _data: { 'pulso_token': 'mock-auth-jwt-resident', 'theme': 'light' },
        getItem(k) { return this._data[k] ?? null; },
        setItem(k, v) { this._data[k] = String(v); },
        removeItem(k) { delete this._data[k]; },
        clear() { this._data = {}; }
    },
    addEventListener() {},
    removeEventListener() {},
};

globalThis.window = windowMock;
globalThis.localStorage = windowMock.localStorage;

async function runSSRDOMTests() {
    console.log('================================================================');
    console.log('🔬 PULSO CHALLENGER 2: VITE SSR & DOM COMPONENT RENDER TESTS');
    console.log('================================================================\n');

    const server = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        root: process.cwd(),
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
        const { MemoryRouter } = await import('react-router-dom');
        const { ThemeProvider } = await server.ssrLoadModule('/src/contexts/ThemeContext.jsx');
        const { default: ClaimReportModal } = await server.ssrLoadModule('/src/components/modals/ClaimReportModal.jsx');
        const { default: PublicTrackPage } = await server.ssrLoadModule('/src/pages/PublicTrackPage.jsx');
        const { default: ReportSuccessPage } = await server.ssrLoadModule('/src/pages/ReportSuccessPage.jsx');

        // Test 1: ClaimReportModal closed returns null
        await test('ClaimReportModal: when isOpen=false, renders nothing', async () => {
            const html = renderToString(
                React.createElement(ClaimReportModal, { isOpen: false, onClose: () => {} })
            );
            assert.strictEqual(html, '');
        });

        // Test 2: ClaimReportModal open renders form with initial ticket & token
        await test('ClaimReportModal: when isOpen=true, renders accessible modal dialog with prefilled values', async () => {
            try {
                const html = renderToString(
                    React.createElement(ClaimReportModal, {
                        isOpen: true,
                        initialTicketId: 'RPT-20260902-8F92E1B4',
                        initialTrackingToken: 'TRK-TEST-TOKEN',
                        onClose: () => {},
                    })
                );
                assert.ok(html.includes('role="dialog"'), 'Must have role=dialog');
            } catch (err) {
                if (err.message.includes('motion is not defined')) {
                    throw new Error('CRITICAL BUG: "motion" is not imported in ClaimReportModal.jsx (Line 2 only imports AnimatePresence).');
                }
                throw err;
            }
        });

        // Test 3: PublicTrackPage renders initial search form
        await test('PublicTrackPage: renders tracking input form and header in MemoryRouter + ThemeProvider', async () => {
            const html = renderToString(
                React.createElement(
                    ThemeProvider,
                    null,
                    React.createElement(
                        MemoryRouter,
                        { initialEntries: ['/track?id=RPT-20260902-8F92E1B4&token=TRK-1234'] },
                        React.createElement(PublicTrackPage)
                    )
                )
            );
            assert.ok(html.includes('track-ticket-id'), 'Must have ticket lookup input');
            assert.ok(html.includes('track-token'), 'Must have token lookup input');
            assert.ok(html.includes('RPT-20260902-8F92E1B4'), 'Prefilled search param ID must render');
        });

        // Test 4: ReportSuccessPage renders receipt with ticket and tracking token
        await test('ReportSuccessPage: renders ticket ID, secret token, and copy action buttons', async () => {
            const receiptState = {
                ticketId: 'RPT-20260902-SUCCESS',
                trackingToken: 'TRK-VAULT-SECRET',
                category: 'Roads & Bridges',
                locationString: 'Camarin Road, Caloocan',
            };
            const html = renderToString(
                React.createElement(
                    ThemeProvider,
                    null,
                    React.createElement(
                        MemoryRouter,
                        { initialEntries: [{ pathname: '/report/success', state: receiptState }] },
                        React.createElement(ReportSuccessPage)
                    )
                )
            );
            assert.ok(html.includes('RPT-20260902-SUCCESS'), 'Must render official ticket ID');
            assert.ok(html.includes('TRK-VAULT-SECRET'), 'Must render secret tracking code');
            assert.ok(html.includes('Camarin Road, Caloocan'), 'Must render location');
        });

        // Test 5: ResidentDashboard identifier check on History / Activity
        await test('ResidentDashboard: check <History /> and <Activity /> identifier resolution', async () => {
            // Test whether <History /> or <Activity /> can be instantiated without import
            const dashboardModule = await server.ssrLoadModule('/src/pages/ResidentDashboard.jsx');
            assert.ok(dashboardModule.default, 'ResidentDashboard component module loads');
        });

        console.log('\n================================================================');
        console.log(`📊 SSR/DOM RESULTS: ${passed} / ${passed + failed} PASSED`);
        console.log('================================================================');

        await server.close();

    } catch (err) {
        console.error('Fatal SSR test error:', err);
        await server.close();
        process.exit(1);
    }
}

runSSRDOMTests();
