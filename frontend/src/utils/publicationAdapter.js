// The same reviewed publication record backs resident feeds and staff authoring.
export function residentPublication(item, language = 'en') {
    const fil = /^(fil|tl)/i.test(language);
    const details = item.publication_details || {};
    return {
        ...item,
        title: (fil && item.title_fil) || item.title_en || '',
        description: (fil && item.content_fil) || item.content_en || '',
        department: details.issuing_office || '',
        barangay: item.target_barangays?.length ? item.target_barangays.join(', ') : '',
        created_at: item.published_at,
        updated_at: `${item.content_version || 0}:${item.published_at || ''}`,
        public_url: `/updates/${item.id}?lang=${fil ? 'fil' : 'en'}`,
    };
}
