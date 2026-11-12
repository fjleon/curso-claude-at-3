import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response } from 'express'
import { TableController } from './table.controller.js'
import { TableService } from '@services/table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import type { Restaurant } from '@models/restaurant.model.js'
import type { Table } from '@models/table.model.js'

function fakeRes() {
    const res = {
        statusCode: 0,
        body: undefined as unknown,
        status: vi.fn(function (this: any, code: number) { this.statusCode = code; return this }),
        json: vi.fn(function (this: any, body: unknown) { this.body = body; return this }),
        send: vi.fn(function (this: any) { return this })
    }
    return res
}

function req(params: Record<string, string>, body: unknown = {}, query: Record<string, unknown> = {}): Request {
    return { params, body, query } as unknown as Request
}

const TABLE_KEYS = ['capacity', 'createdAt', 'description', 'id', 'number', 'restaurantId', 'status', 'updatedAt']

describe('TableController', () => {
    let service: TableService
    let controller: TableController
    let next: ReturnType<typeof vi.fn>
    let table: Table

    beforeEach(async () => {
        const restaurants = new MockRestaurantRepository()
        await restaurants.save({ id: 'r1' } as unknown as Restaurant)
        service = new TableService(new MockTableRepository(), restaurants)
        controller = new TableController(service)
        next = vi.fn()
        table = await service.create({ restaurantId: 'r1', number: 1, capacity: 4 })
    })

    async function call(handler: keyof TableController, request: Request) {
        const res = fakeRes()
        await (controller[handler] as any)(request, res as unknown as Response, next)
        return res
    }

    it('create responde 201 con la mesa y toma restaurantId de la ruta', async () => {
        const res = await call('create', req({ restaurantId: 'r1' }, { number: 10, capacity: 2, description: 'Terraza', restaurantId: 'otro' }))

        expect(res.statusCode).toBe(201)
        expect(Object.keys(res.body as object).sort()).toEqual(TABLE_KEYS)
        expect(res.body).toMatchObject({ restaurantId: 'r1', number: 10, capacity: 2, description: 'Terraza', status: 'libre' })
    })

    it('getAll responde 200 con el array de mesas', async () => {
        const res = await call('getAll', req({ restaurantId: 'r1' }))
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual([table])
    })

    it('getById responde 200 con la mesa', async () => {
        const res = await call('getById', req({ restaurantId: 'r1', id: table.id }))
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual(table)
    })

    it('update responde 200 con la mesa actualizada', async () => {
        const res = await call('update', req({ restaurantId: 'r1', id: table.id }, { number: 2, capacity: 6, status: 'reservada' }))
        expect(res.statusCode).toBe(200)
        expect(res.body).toMatchObject({ id: table.id, number: 2, capacity: 6, status: 'reservada' })
    })

    it('delete responde 204 sin cuerpo', async () => {
        const res = await call('delete', req({ restaurantId: 'r1', id: table.id }))
        expect(res.statusCode).toBe(204)
        expect(res.send).toHaveBeenCalledWith()
        expect(res.json).not.toHaveBeenCalled()
    })

    it('changeStatus responde 200 con la mesa completa', async () => {
        const res = await call('changeStatus', req({ restaurantId: 'r1', id: table.id }, { status: 'ocupada' }))
        expect(res.statusCode).toBe(200)
        expect(res.body).toMatchObject({ id: table.id, status: 'ocupada', number: 1 })
    })

    it('getAvailable responde 200 filtrando por people de la query', async () => {
        await service.create({ restaurantId: 'r1', number: 2, capacity: 2 })
        const res = await call('getAvailable', req({ restaurantId: 'r1' }, {}, { people: '3' }))
        expect(res.statusCode).toBe(200)
        expect((res.body as Table[]).map(t => t.number)).toEqual([1])
    })

    it('occupy responde 200 con la mesa ocupada', async () => {
        const res = await call('occupy', req({ restaurantId: 'r1', id: table.id }))
        expect(res.statusCode).toBe(200)
        expect(res.body).toMatchObject({ id: table.id, status: 'ocupada' })
    })

    it.each([
        ['getById', req({ restaurantId: 'r1', id: 'no-existe' }), 'TableNotFoundError'],
        ['create', req({ restaurantId: 'r1' }, { number: 1, capacity: 2 }), 'DuplicatedTableNumberError'],
        ['changeStatus', req({ restaurantId: 'r1', id: 'x' }, {}), 'TableNotFoundError'],
        ['getAvailable', req({ restaurantId: 'r1' }, {}, {}), 'InvalidPeopleError']
    ] as const)('%s delega los errores en next (%s)', async (handler, request, errorName) => {
        const res = await call(handler, request)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next.mock.calls[0]![0].name).toBe(errorName)
        expect(res.status).not.toHaveBeenCalled()
    })

    it('changeStatus sin cuerpo da InvalidTableStatusError', async () => {
        await call('changeStatus', { params: { restaurantId: 'r1', id: table.id } } as unknown as Request)
        expect(next.mock.calls[0]![0].name).toBe('InvalidTableStatusError')
    })
})
