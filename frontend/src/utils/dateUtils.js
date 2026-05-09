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

/**
 * Parse a date string (ISO or DD/MM/YYYY) into a local Date object (midnight).
 */
export function parseDate(raw) {
    if (!raw) return null
    if (raw instanceof Date) return raw
    const s = String(raw)
    if (s.includes('/')) {
        const parts = s.split('/')
        if (parts.length === 3) {
            const [day, month, year] = parts
            return new Date(Number(year), Number(month) - 1, Number(day))
        }
    }
    const datePart = s.includes('T') ? s.split('T')[0] : s
    const parts = datePart.split('-')
    if (parts.length === 3) {
        const [year, month, day] = parts
        return new Date(Number(year), Number(month) - 1, Number(day))
    }
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
}

/**
 * Parse a datetime string (ISO "YYYY-MM-DDTHH:mm...") into a local Date object
 * while preserving the "wall-clock" time (no timezone conversion).
 */
export function parseDateTime(raw) {
    if (!raw) return null
    if (raw instanceof Date) return raw
    const s = String(raw)
    
    // If it's just a date without time, use parseDate
    if (!s.includes('T') && !s.includes(':')) {
        return parseDate(raw)
    }

    try {
        const datePart = s.includes('T') ? s.split('T')[0] : s.split(' ')[0]
        const timePart = s.includes('T') ? s.split('T')[1] : s.split(' ')[1]

        const [year, month, day] = datePart.split('-').map(Number)
        const [hour, min] = (timePart || '00:00').split(':').map(Number)

        const d = new Date(year, month - 1, day, hour || 0, min || 0, 0)
        return isNaN(d.getTime()) ? null : d
    } catch (e) {
        const d = new Date(s)
        return isNaN(d.getTime()) ? null : d
    }
}

/**
 * Adds minutes to a time string (HH:MM) and returns the result as HH:MM.
 * Handles overflow to next day (but doesn't return the date).
 */
export function addMinutesToTime(timeStr, minutes) {
    if (!timeStr || timeStr === '—') return '—'
    const [h, m] = timeStr.split(':').map(Number)
    const totalMinutes = h * 60 + m + Number(minutes)
    const newH = Math.floor(totalMinutes / 60) % 24
    const newM = totalMinutes % 60
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
}

/**
 * Format a date as YYYY-MM-DD for HTML5 date inputs.
 * Tries to avoid timezone shifts by splitting strings if possible.
 */
export function formatDateForInput(raw) {
    if (!raw) return ''
    
    // Se for objeto Date, converter diretamente
    const d = (raw instanceof Date) ? raw : new Date(raw)
    if (isNaN(d.getTime())) {
        // Se falhar e for string, podemos tentar extrair a data se tiver formato ISO
        const s = String(raw)
        if (s.includes('T') && s.match(/^\d{4}-\d{2}-\d{2}T/)) {
            return s.split('T')[0]
        }
        return ''
    }
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Combines a date (YYYY-MM-DD) and a time (HH:MM) into a UTC ISO string
 * while preserving the "wall-clock" time (no timezone shift).
 */
export function toWallClockISO(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null
    return `${dateStr}T${timeStr.substring(0, 5)}:00.000Z`
}
