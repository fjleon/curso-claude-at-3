import { describe, it, expect } from 'vitest'
import { normalizeTableStatus } from './table.model.js'
import { InvalidTableStatusError } from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it('acepta los estados válidos', () => {
        for (const status of ['libre', 'ocupada', 'reservada']) {
            expect(normalizeTableStatus(status)).toBe(status)
        }
    })

    it('normaliza mayúsculas y espacios', () => {
        expect(normalizeTableStatus(' Reservada ')).toBe('reservada')
        expect(normalizeTableStatus('OCUPADA')).toBe('ocupada')
    })

    it('lanza InvalidTableStatusError con un estado desconocido', () => {
        expect(() => normalizeTableStatus('rota')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus('rota')).toThrow(
            'Estado de mesa inválido: rota. Debe ser uno de: libre, ocupada, reservada'
        )
    })

    it('lanza InvalidTableStatusError si el estado está vacío o no es texto', () => {
        expect(() => normalizeTableStatus('')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus(undefined as unknown as string)).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus(3 as unknown as string)).toThrow(InvalidTableStatusError)
    })
})
