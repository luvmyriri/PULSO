/**
 * Safely escapes a single cell value for CSV output.
 * Implements CWE-1236 Formula Injection safeguards by prepending a single quote
 * if the text begins with dangerous execution tokens (=, +, -, @, \t, \r).
 * Handles null/undefined and escapes internal double quotes.
 */
export function escapeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    // Keep actual numeric counts numeric; neutralize text even after leading whitespace.
    if (typeof val !== 'number' && (/^[\s\uFEFF]*[=+\-@]/.test(str) || /^[\t\r\n]/.test(str))) {
        str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
}

export function serializeCsv(headers, rows = []) {
    return '\uFEFF' + [headers, ...rows].map(row => (Array.isArray(row) ? row : []).map(escapeCsvCell).join(',')).join('\r\n');
}

/**
 * Downloads an array of rows as a CSV file.
 * Automatically adds UTF-8 BOM (\uFEFF) for Excel compatibility.
 * 
 * @param {string[]} headers Array of header strings
 * @param {Array<Array<any>>} rows Array of row arrays
 * @param {string} filename Base filename (without extension or with .csv)
 * @returns {boolean} Whether download was successfully initiated
 */
export function downloadCsv(headers, rows, filename = 'export') {
    if (!headers || !headers.length) return false;

    // UTF-8 BOM (\uFEFF) ensures Excel and spreadsheet apps render international characters correctly
    const csvContent = serializeCsv(headers, rows || []);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.setAttribute('download', cleanFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
}
