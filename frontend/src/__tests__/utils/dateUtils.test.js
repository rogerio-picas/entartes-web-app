import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, parseDate, addMinutesToTime, toWallClockISO, parseDateTime } from '../../utils/dateUtils'

describe('dateUtils', () => {
    describe('formatDate', () => {
        it('should format YYYY-MM-DD to DD/MM/YYYY', () => {
            expect(formatDate('2026-04-25')).toBe('25/04/2026')
        })

        it('should format ISO string date part to DD/MM/YYYY', () => {
            expect(formatDate('2026-04-25T14:30:00.000Z')).toBe('25/04/2026')
        })

        it('should return em-dash for null/undefined', () => {
            expect(formatDate(null)).toBe('—')
        })
    })

    describe('formatTime', () => {
        it('should extract HH:MM from HH:MM:SS', () => {
            expect(formatTime('14:30:00')).toBe('14:30')
        })

        it('should extract HH:MM from ISO string', () => {
            expect(formatTime('2026-04-25T14:30:00.000Z')).toBe('14:30')
        })
    })

    describe('parseDate', () => {
        it('should parse YYYY-MM-DD into a Date object at midnight', () => {
            const d = parseDate('2026-04-25')
            expect(d.getFullYear()).toBe(2026)
            expect(d.getMonth()).toBe(3) // April is 3
            expect(d.getDate()).toBe(25)
            expect(d.getHours()).toBe(0)
        })

        it('should parse DD/MM/YYYY into a Date object at midnight', () => {
            const d = parseDate('25/04/2026')
            expect(d.getFullYear()).toBe(2026)
            expect(d.getMonth()).toBe(3)
            expect(d.getDate()).toBe(25)
        })
    })

    describe('addMinutesToTime', () => {
        it('should add minutes to a time string', () => {
            expect(addMinutesToTime('14:30', 30)).toBe('15:00')
        })

        it('should handle overflow beyond 24h', () => {
            expect(addMinutesToTime('23:30', 60)).toBe('00:30')
        })
    })

    describe('toWallClockISO', () => {
        it('should combine date and time into a "wall-clock" ISO string', () => {
            expect(toWallClockISO('2026-04-25', '14:30')).toBe('2026-04-25T14:30:00.000Z')
        })
    })

    // This one will fail if I haven't re-added parseDateTime
    describe('parseDateTime', () => {
        it('should parse ISO string into a local Date object preserving time', () => {
            const d = parseDateTime('2026-04-25T14:30:00.000Z')
            expect(d.getFullYear()).toBe(2026)
            expect(d.getMonth()).toBe(3)
            expect(d.getDate()).toBe(25)
            expect(d.getHours()).toBe(14)
            expect(d.getMinutes()).toBe(30)
        })
    })
})
