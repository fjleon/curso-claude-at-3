import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    DuplicatedTableNumberError,
    InvalidCapacityError,
    InvalidTableNumberError,
    InvalidTableStatusError,
    RestaurantNotFoundError
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
})
