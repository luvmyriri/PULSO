/** Fetch every authorized report page against the same server snapshot. */
export async function fetchReportPages({ baseUrl, token, scope, signal, pageSize = 1000, fetcher = fetch }) {
    const query = new URLSearchParams(scope);
    query.set('limit', String(pageSize));
    const records = [];
    const seen = new Set();
    let total;
    for (;;) {
        query.set('skip', String(records.length));
        const response = await fetcher(`${baseUrl}/api/reports?${query}`, { signal, headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error(`Reports could not be loaded (HTTP ${response.status}). Retry to check the current queue.`);
        const page = await response.json();
        if (!Array.isArray(page)) throw new Error('Report response was invalid. Retry to check the current queue.');
        if (total === undefined) {
            const count = response.headers.get('X-Total-Count');
            total = count !== null && /^\d+$/.test(count) ? Number(count) : undefined;
            const snapshot = response.headers.get('X-Reports-As-Of');
            if (snapshot) query.set('as_of', snapshot);
        }
        for (const report of page) {
            if (!Number.isInteger(report.id) || seen.has(report.id)) throw new Error('The report queue changed while loading. Refresh to load a consistent list.');
            seen.add(report.id);
            records.push(report);
        }
        if (page.length < pageSize || (total !== undefined && records.length >= total)) break;
    }
    if (total !== undefined && records.length !== total) throw new Error('The complete report queue could not be loaded. Refresh to try again.');
    return records;
}

/** Combine map pages without losing the selected asset or source filters. */
export async function fetchReportMapPages({ path, first, request }) {
    const [endpoint, search = ''] = path.split('?');
    const query = new URLSearchParams(search);
    query.set('as_of', first.as_of);
    const items = [];
    const seen = new Set();
    let page = first;
    for (;;) {
        if (!Array.isArray(page.items) || page.total !== first.total) throw new Error('The complete report map could not be loaded. Refresh to try again.');
        for (const item of page.items) {
            if (!Number.isInteger(item.id) || seen.has(item.id)) throw new Error('The report map changed while loading. Refresh to try again.');
            seen.add(item.id);
            items.push(item);
        }
        if (page.next_skip == null) break;
        if (!Number.isInteger(page.next_skip) || page.next_skip !== items.length || !page.items.length) throw new Error('The report map returned an invalid page. Refresh to try again.');
        query.set('skip', String(page.next_skip));
        page = await request(`${endpoint}?${query}`);
    }
    if (items.length !== first.total) throw new Error('The complete report map could not be loaded. Refresh to try again.');
    return { ...first, items, truncated: false, next_skip: null };
}
