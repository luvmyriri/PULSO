import { exportResidentReportsToXLSX } from "../../utils/xlsxExport";

const formatAddress = (addr) => {
    if (!addr || typeof addr !== 'string') return '';
    return addr
        .replace(/\b([a-z])/g, (char) => char.toUpperCase())
        .replace(/\s*,\s*/g, ', ')
        .trim();
};

const formatFriendlyNotice = (reason) => {
    if (!reason) {
        return "We couldn't clearly spot a city problem in this photo. Please upload a clear photo of the actual damage.";
    }
    let clean = String(reason).trim();
    clean = clean.replace(/^(AI Safety Warning:\s*)+/i, '');
    clean = clean.replace(/^(Image rejected:\s*)+/i, '');
    clean = clean.replace(/^(Report rejected:\s*)+/i, '');
    clean = clean.replace(/^Report rejected by AI Safety Filter:\s*/i, '');
    clean = clean.replace(/\s*\(?such as a pothole,\s*broken streetlight,\s*or (?:drainage hazard|water leak|leak)\.?\)?/gi, '');

    const lower = clean.toLowerCase();
    if (lower.includes('selfie') || lower.includes('portrait')) {
        return "This looks like a personal photo or selfie. Please take a clear photo of the public infrastructure issue instead.";
    }
    if (lower.includes('infrastructure issue') || lower.includes('valid infrastructure') || lower.includes('hazard or damage')) {
        return "We couldn't clearly spot a community issue in this photo. Please take or upload a photo showing the actual problem.";
    }
    return clean;
};

/**
 * Checks if the current client hostname is a local development host.
 */
const isLocalDevHost = () => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(h);
};

/**
 * Exports resident reports as an artistic, professionally styled .xlsx workbook.
 */
const exportReportsToXLSX = async (reports, residentName = 'Citizen') => {
    if (!reports || !Array.isArray(reports) || reports.length === 0) return false;
    try {
        await exportResidentReportsToXLSX(reports, residentName);
        return true;
    } catch (err) {
        console.error('Failed to export resident reports to XLSX:', err);
        return false;
    }
};

const exportReportsToCSV = exportReportsToXLSX;

export { formatAddress, formatFriendlyNotice, isLocalDevHost, exportReportsToXLSX, exportReportsToCSV };
