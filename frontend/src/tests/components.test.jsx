import { render, screen, fireEvent } from '@testing-library/react'

// ─── StarPicker (inline — same logic as MyAppointments) ──────────────────────
const StarPicker = ({ value, onChange }) => (
    <div data-testid='star-picker'>
        {[1, 2, 3, 4, 5].map(s => (
            <button key={s} data-testid={`star-${s}`}
                onClick={() => onChange(s)}
                className={s <= value ? 'filled' : 'empty'}>★</button>
        ))}
    </div>
)

// ─── PrescriptionView (inline) ────────────────────────────────────────────────
const PrescriptionView = ({ prescription, onClose }) => (
    <div data-testid='prescription-modal'>
        <button onClick={onClose} data-testid='close-btn'>✕</button>
        {prescription.diagnosis && <p data-testid='diagnosis'>{prescription.diagnosis}</p>}
        {prescription.medicines?.map((m, i) => (
            <p key={i} data-testid={`medicine-${i}`}>{m.name}</p>
        ))}
        {prescription.followUpDate && <p data-testid='followup'>{prescription.followUpDate}</p>}
    </div>
)

// ─── StarPicker Tests ─────────────────────────────────────────────────────────
describe('StarPicker', () => {
    it('renders 5 star buttons', () => {
        render(<StarPicker value={0} onChange={() => {}} />)
        expect(screen.getByTestId('star-picker')).toBeInTheDocument()
        for (let i = 1; i <= 5; i++) {
            expect(screen.getByTestId(`star-${i}`)).toBeInTheDocument()
        }
    })

    it('calls onChange with correct value when star clicked', () => {
        const mockOnChange = vi.fn()
        render(<StarPicker value={0} onChange={mockOnChange} />)
        fireEvent.click(screen.getByTestId('star-3'))
        expect(mockOnChange).toHaveBeenCalledWith(3)
    })

    it('marks stars as filled up to the value', () => {
        render(<StarPicker value={3} onChange={() => {}} />)
        expect(screen.getByTestId('star-1').className).toBe('filled')
        expect(screen.getByTestId('star-3').className).toBe('filled')
        expect(screen.getByTestId('star-4').className).toBe('empty')
        expect(screen.getByTestId('star-5').className).toBe('empty')
    })
})

// ─── PrescriptionView Tests ───────────────────────────────────────────────────
describe('PrescriptionView', () => {
    const mockPrescription = {
        diagnosis: 'Common Cold',
        medicines: [
            { name: 'Paracetamol', dosage: '500mg', duration: '3 days' },
            { name: 'Vitamin C', dosage: '1000mg', duration: '5 days' }
        ],
        notes: 'Rest and drink plenty of water',
        followUpDate: '2026-05-10'
    }

    it('renders diagnosis', () => {
        render(<PrescriptionView prescription={mockPrescription} onClose={() => {}} />)
        expect(screen.getByTestId('diagnosis')).toHaveTextContent('Common Cold')
    })

    it('renders all medicines', () => {
        render(<PrescriptionView prescription={mockPrescription} onClose={() => {}} />)
        expect(screen.getByTestId('medicine-0')).toHaveTextContent('Paracetamol')
        expect(screen.getByTestId('medicine-1')).toHaveTextContent('Vitamin C')
    })

    it('renders follow-up date', () => {
        render(<PrescriptionView prescription={mockPrescription} onClose={() => {}} />)
        expect(screen.getByTestId('followup')).toHaveTextContent('2026-05-10')
    })

    it('calls onClose when close button clicked', () => {
        const mockOnClose = vi.fn()
        render(<PrescriptionView prescription={mockPrescription} onClose={mockOnClose} />)
        fireEvent.click(screen.getByTestId('close-btn'))
        expect(mockOnClose).toHaveBeenCalledOnce()
    })

    it('does not render diagnosis section if empty', () => {
        render(<PrescriptionView prescription={{ medicines: [] }} onClose={() => {}} />)
        expect(screen.queryByTestId('diagnosis')).not.toBeInTheDocument()
    })
})

// ─── Slot date formatting ──────────────────────────────────────────────────────
describe('slotDateFormat', () => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const format = (slotDate) => {
        const [d, m, y] = slotDate.split('_')
        return `${d} ${months[Number(m) - 1]} ${y}`
    }

    it('formats April correctly', () => expect(format('28_4_2026')).toBe('28 Apr 2026'))
    it('formats December correctly', () => expect(format('31_12_2025')).toBe('31 Dec 2025'))
    it('formats January correctly', () => expect(format('1_1_2026')).toBe('1 Jan 2026'))
})
