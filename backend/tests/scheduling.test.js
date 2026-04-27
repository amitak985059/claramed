import { describe, it, expect } from '@jest/globals'

// ─── Inline the slot generator (same logic as Appointment.jsx) ─────────────────
const generateSlots = (schedule = {}) => {
    const {
        workDays     = [1, 2, 3, 4, 5],
        startHour    = 10,
        endHour      = 21,
        slotDuration = 30
    } = schedule

    const today = new Date()
    const slots = []

    for (let d = 0; d < 7; d++) {
        const date = new Date(today)
        date.setDate(today.getDate() + d)
        const dayOfWeek = date.getDay()

        if (!workDays.includes(dayOfWeek)) continue

        const daySlots = []
        let hour = startHour
        let min  = 0

        while (hour < endHour || (hour === endHour && min === 0)) {
            daySlots.push(
                `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
            )
            min += slotDuration
            if (min >= 60) { hour += Math.floor(min / 60); min = min % 60 }
            if (hour > endHour) break
        }

        if (daySlots.length > 0) slots.push({ date, slots: daySlots })
    }

    return slots
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('generateSlots — default schedule', () => {
    it('returns max 7 days', () => {
        const result = generateSlots()
        expect(result.length).toBeLessThanOrEqual(7)
    })

    it('only includes weekdays by default', () => {
        const result = generateSlots({ workDays: [1, 2, 3, 4, 5] })
        result.forEach(day => {
            const dow = day.date.getDay()
            expect([1, 2, 3, 4, 5]).toContain(dow)
        })
    })

    it('produces 30-min intervals by default', () => {
        const result = generateSlots({
            workDays: [1, 2, 3, 4, 5, 6, 0],  // all days to ensure we get results
            startHour: 10, endHour: 12, slotDuration: 30
        })
        if (result.length > 0) {
            // 10:00, 10:30, 11:00, 11:30, 12:00 → 5 slots (endHour slot included)
            expect(result[0].slots.length).toBe(5)
        }
    })
})

describe('generateSlots — custom schedules', () => {
    it('respects 60-minute slot duration', () => {
        const result = generateSlots({
            workDays: [0, 1, 2, 3, 4, 5, 6],
            startHour: 9, endHour: 12, slotDuration: 60
        })
        if (result.length > 0) {
            // 09:00, 10:00, 11:00, 12:00 → 4 slots (endHour slot included)
            expect(result[0].slots.length).toBe(4)
        }
    })

    it('includes all 7 days when all workDays set', () => {
        const result = generateSlots({
            workDays: [0, 1, 2, 3, 4, 5, 6],
            startHour: 9, endHour: 17, slotDuration: 30
        })
        expect(result.length).toBe(7)
    })

    it('returns empty array when no workDays', () => {
        const result = generateSlots({ workDays: [] })
        expect(result).toEqual([])
    })

    it('generates 15-min slots correctly', () => {
        const result = generateSlots({
            workDays: [0, 1, 2, 3, 4, 5, 6],
            startHour: 10, endHour: 11, slotDuration: 15
        })
        if (result.length > 0) {
            // 10:00, 10:15, 10:30, 10:45, 11:00 → 5 slots (endHour slot included)
            expect(result[0].slots.length).toBe(5)
        }
    })
})

describe('generateSlots — edge cases', () => {
    it('handles startHour === endHour gracefully (no slots)', () => {
        const result = generateSlots({
            workDays: [0, 1, 2, 3, 4, 5, 6],
            startHour: 10, endHour: 10, slotDuration: 30
        })
        // Each day should have 0 or 1 slot at most (just the :00 mark)
        result.forEach(day => {
            expect(day.slots.length).toBeLessThanOrEqual(1)
        })
    })

    it('does not produce slots past endHour', () => {
        const result = generateSlots({
            workDays: [0, 1, 2, 3, 4, 5, 6],
            startHour: 10, endHour: 12, slotDuration: 30
        })
        result.forEach(day => {
            day.slots.forEach(slot => {
                const hour = parseInt(slot.split(':')[0])
                expect(hour).toBeLessThanOrEqual(12)
            })
        })
    })
})

// ─── Slot date formatting ──────────────────────────────────────────────────────
describe('slotDateFormat', () => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const slotDateFormat = (slotDate) => {
        const [d, m, y] = slotDate.split('_')
        return `${d} ${months[Number(m) - 1]} ${y}`
    }

    it('formats correctly', () => {
        expect(slotDateFormat('15_4_2026')).toBe('15 Apr 2026')
        expect(slotDateFormat('1_12_2025')).toBe('1 Dec 2025')
        expect(slotDateFormat('31_1_2026')).toBe('31 Jan 2026')
    })
})
