// A navigation without a returned report cannot become a sample success receipt.
export function reportReceipt(state = {}) {
    const report=state.report;
    if(!report || !Number.isInteger(report.id) || report.id<=0 || typeof report.ticket_id!=='string' || !report.ticket_id ||
        state.ticketId!==report.ticket_id)return null;
    const rawUrl=report.tracking_url || state.trackingUrl;
    let trackingUrl=null;
    try{const url=new URL(rawUrl);if(['http:','https:'].includes(url.protocol))trackingUrl=url.href;}catch{ /* No fabricated lookup link. */ }
    const created=report.created_at || state.createdAt;
    return {ticketId:report.ticket_id,trackingToken:report.tracking_token || state.trackingToken || null,
        trackingUrl,createdAt:created&&Number.isFinite(Date.parse(created))?created:null,
        category:(Array.isArray(report.categories)&&report.categories.length?report.categories:[report.category]).filter(Boolean).join(' + ') || null,
        locationString:report.location_string || null,status:typeof report.status==='string'?report.status:null};
}
