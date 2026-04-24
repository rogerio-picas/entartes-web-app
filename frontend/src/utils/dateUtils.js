/**
 * Format a raw API date/datetime string as DD/MM/YYYY without timezone conversion.
 * Accepts: "YYYY-MM-DD", "YYYY-MM-DDTHH:MM:SS.sssZ", or any ISO-like string.
 */
export function formatDate(raw) {
    if (!raw) return '—'
    const s = String(raw)
    const datePart = s.includes('T') ? s.split('T')[0] : s
    const [year, month, day] = datePart.split('-')
    if (!year || !month || !day) return s
    return `${day}/${month}/${year}`
}

/**
 * Extract the HH:MM portion from a raw API time/datetime string without timezone conversion.
 * Accepts: "HH:MM:SS", "YYYY-MM-DDTHH:MM:SS.sssZ", or similar.
 */
export function formatTime(raw) {
    if (!raw) return '—'
    const s = String(raw)
    if (s.includes('T')) return s.substring(11, 16)
    return s.substring(0, 5)
}
