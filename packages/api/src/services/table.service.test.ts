import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    DuplicatedTableNumberError,
    InvalidCapacityError,
    InvalidTableNumberError,
    InvalidTableStatusError,
    RestaurantNotFoundError,
    TableNotFoundError
} from '@errors/DomainErrors.js'
import type { Restaurant } from '@models/restaurant.model.js'

const restaurant = (id: string) => ({ id, name: `Restaurante ${id}` }) as unknown as Restaurant

describe('TableService', () => {
    let tableRepo: MockTableRepository
    let restaurantRepo: MockRestaurantRepository
    let service: TableService

    beforeEach(async () => {
        tableRepo = new MockTableRepository()
        restaurantRepo = new MockRestaurantRepository()
        await restaurantRepo.save(restaurant('r1'))
        await restaurantRepo.save(restaurant('r2'))
        service = new TableService(tableRepo, restaurantRepo)
    })

    describe('create', () => {
        it('crea una mesa libre y la guarda', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 10, capacity: 4, description: 'Terraza' })

            expect(table).toMatchObject({ restaurantId: 'r1', number: 10, capacity: 4, description: 'Terraza', status: 'libre' })
            expect(table.id).toBeTruthy()
            expect(table.createdAt).toBe(table.updatedAt)
            expect(await tableRepo.findById(table.id)).toEqual(table)
        })

        it('guarda description null si se omite, es null o está vacía', async () => {
            const a = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
            const b = await service.create({ restaurantId: 'r1', number: 2, capacity: 2, description: null })
            const c = await service.create({ restaurantId: 'r1', number: 3, capacity: 2, description: '   ' })
            expect([a.description, b.description, c.description]).toEqual([null, null, null])
        })

        it('recorta los espacios de la descripción', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2, description: '  Ventana ' })
            expect(table.description).toBe('Ventana')
        })

        it('acepta un estado inicial opcional y lo normaliza', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 2, status: ' Reservada ' })
            expect(table.status).toBe('reservada')
        })

        it('rechaza un estado inválido', async () => {
            await expect(service.create({ restaurantId: 'r1', number: 1, capacity: 2, status: 'rota' }))
                .rejects.toThrow(InvalidTableStatusError)
        })

        it.each([0, -1, 1.5, '4', null, undefined])('rechaza el número %s', async (number) => {
            await expect(service.create({ restaurantId: 'r1', number: number as number, capacity: 2 }))
                .rejects.toThrow(InvalidTableNumberError)
        })

        it.each([0, -3, 2.5, '4', null, undefined])('rechaza la capacidad %s', async (capacity) => {
            await expect(service.create({ restaurantId: 'r1', number: 1, capacity: capacity as number }))
                .rejects.toThrow(InvalidCapacityError)
        })

        it('rechaza un número repetido en el mismo restaurante', async () => {
            await service.create({ restaurantId: 'r1', number: 5, capacity: 2 })
            await expect(service.create({ restaurantId: 'r1', number: 5, capacity: 4 }))
                .rejects.toThrow(DuplicatedTableNumberError)
        })

        it('permite el mismo número en otro restaurante', async () => {
            await service.create({ restaurantId: 'r1', number: 5, capacity: 2 })
            const table = await service.create({ restaurantId: 'r2', number: 5, capacity: 2 })
            expect(table.restaurantId).toBe('r2')
        })

        it('lanza RestaurantNotFoundError si el restaurante no existe', async () => {
            await expect(service.create({ restaurantId: 'no-existe', number: 1, capacity: 2 }))
                .rejects.toThrow(RestaurantNotFoundError)
        })
    })

    describe('findById', () => {
        it('devuelve la mesa del restaurante', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
            expect(await service.findById('r1', created.id)).toEqual(created)
        })

        it('lanza TableNotFoundError si no existe', async () => {
            await expect(service.findById('r1', 'no-existe')).rejects.toThrow(TableNotFoundError)
        })

        it('lanza TableNotFoundError si la mesa es de otro restaurante', async () => {
            const created = await service.create({ restaurantId: 'r2', number: 1, capacity: 2 })
            await expect(service.findById('r1', created.id)).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('findByRestaurantId', () => {
        it('lista solo las mesas del restaurante ordenadas por número', async () => {
            await service.create({ restaurantId: 'r1', number: 3, capacity: 2 })
            await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
            await service.create({ restaurantId: 'r2', number: 2, capacity: 2 })

            const tables = await service.findByRestaurantId('r1')
            expect(tables.map(t => t.number)).toEqual([1, 3])
        })

        it('devuelve [] si el restaurante no tiene mesas o no existe', async () => {
            expect(await service.findByRestaurantId('no-existe')).toEqual([])
        })
    })

    describe('update', () => {
        it('reemplaza número, capacidad y descripción conservando el estado si no se envía', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, capacity: 2, description: 'Ventana', status: 'reservada' })

            const updated = await service.update('r1', created.id, { number: 7, capacity: 6 })

            expect(updated).toMatchObject({ id: created.id, restaurantId: 'r1', number: 7, capacity: 6, description: null, status: 'reservada', createdAt: created.createdAt })
            expect(await tableRepo.findById(created.id)).toEqual(updated)
        })

        it('aplica el estado si se envía', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
            const updated = await service.update('r1', created.id, { number: 1, capacity: 2, status: 'OCUPADA' })
            expect(updated.status).toBe('ocupada')
        })

        it('permite conservar el propio número', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 4, capacity: 2 })
            const updated = await service.update('r1', created.id, { number: 4, capacity: 8, description: 'Grande' })
            expect(updated).toMatchObject({ number: 4, capacity: 8, description: 'Grande' })
        })

        it('rechaza el número de otra mesa del restaurante', async () => {
            await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
            const other = await service.create({ restaurantId: 'r1', number: 2, capacity: 2 })
            await expect(service.update('r1', other.id, { number: 1, capacity: 2 }))
                .rejects.toThrow(DuplicatedTableNumberError)
        })

        it('valida número, capacidad y estado', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, capacity: 2 })
            await expect(service.update('r1', created.id, { number: 0, capacity: 2 })).rejects.toThrow(InvalidTableNumberError)
            await expect(service.update('r1', created.id, { number: 1, capacity: -1 })).rejects.toThrow(InvalidCapacityError)
            await expect(service.update('r1', created.id, { number: 1, capacity: 2, status: 'rota' })).rejects.toThrow(InvalidTableStatusError)
        })

        it('lanza TableNotFoundError si no existe o es de otro restaurante', async () => {
            const created = await service.create({ restaurantId: 'r2', number: 1, capacity: 2 })
            await expect(service.update('r1', 'no-existe', { number: 1, capacity: 2 })).rejects.toThrow(TableNotFoundError)
            await expect(service.update('r1', created.id, { number: 1, capacity: 2 })).rejects.toThrow(TableNotFoundError)
        })
    })
})
