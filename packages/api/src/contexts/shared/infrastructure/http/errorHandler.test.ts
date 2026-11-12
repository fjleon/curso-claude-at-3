import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    InvalidTableNumberError,
    InvalidCapacityError,
    InvalidTableStatusError,
    InvalidPeopleError,
    DuplicatedTableNumberError,
    TableNotAvailableError,
    TableOccupiedError,
    RestaurantNotFoundError
} from '@errors/DomainErrors.js'

function run(err: unknown) {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
    }
    errorHandler(err, {} as Request, res as unknown as Response, (() => {}) as NextFunction)
    return { status: res.status.mock.calls[0]?.[0], body: res.json.mock.calls[0]?.[0] }
}

describe('errorHandler', () => {
    it('mapea TableNotFoundError a 404 con { error, message }', () => {
        const { status, body } = run(new TableNotFoundError())
        expect(status).toBe(404)
        expect(body).toEqual({ error: 'TableNotFoundError', message: 'Mesa no encontrada' })
    })

    it('mantiene RestaurantNotFoundError en 404', () => {
        expect(run(new RestaurantNotFoundError()).status).toBe(404)
    })

    it.each([
        [new DuplicatedTableNumberError(), 'DuplicatedTableNumberError'],
        [new TableNotAvailableError(), 'TableNotAvailableError'],
        [new TableOccupiedError(), 'TableOccupiedError']
    ])('mapea %s a 409', (err, name) => {
        const { status, body } = run(err)
        expect(status).toBe(409)
        expect(body.error).toBe(name)
        expect(typeof body.message).toBe('string')
    })

    it.each([
        new InvalidTableNumberError(),
        new InvalidCapacityError(),
        new InvalidTableStatusError(),
        new InvalidPeopleError()
    ])('mapea los errores de validación de mesa (%s) a 400', (err) => {
        expect(run(err).status).toBe(400)
    })

    it('devuelve los mensajes en español', () => {
        expect(new DuplicatedTableNumberError().message).toBe('Ya existe una mesa con ese número en este restaurante')
        expect(new TableNotAvailableError().message).toBe('La mesa ya no está disponible')
        expect(new TableOccupiedError().message).toBe('No se puede borrar una mesa ocupada')
        expect(new InvalidTableNumberError().message).toBe('El número de mesa debe ser un entero mayor que 0')
        expect(new InvalidCapacityError().message).toBe('La capacidad debe ser un entero mayor que 0')
        expect(new InvalidPeopleError().message).toBe('El número de personas debe ser un entero mayor que 0')
    })

    it('responde 500 a errores que no son de dominio', () => {
        expect(run(new Error('boom')).status).toBe(500)
    })
})
