import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'

const now = new Date().toISOString()

function buildTable(overrides: Partial<Table> = {}): Table {
    return {
        id: 't1',
        restaurantId: 'r1',
        number: 1,
        description: null,
        capacity: 4,
        status: 'libre',
        createdAt: now,
        updatedAt: now,
        ...overrides
    }
}

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)

        for (const id of ['r1', 'r2', 'r3']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, `Restaurante ${id}`, 'Calle Mayor 10', `${id}@resttek.com`, '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('guarda y busca una mesa por id', async () => {
        await repo.save(buildTable({ id: 't1', number: 3, description: 'Ventana', capacity: 2 }))

        const found = await repo.findById('t1')
        expect(found).toEqual(buildTable({ id: 't1', number: 3, description: 'Ventana', capacity: 2 }))
    })

    it('devuelve null si la mesa no existe', async () => {
        expect(await repo.findById('no-existe')).toBeNull()
    })

    it('lista las mesas de un restaurante ordenadas por número', async () => {
        await repo.save(buildTable({ id: 't2', number: 1 }))
        await repo.save(buildTable({ id: 't3', number: 2 }))
        await repo.save(buildTable({ id: 't-r2', restaurantId: 'r2', number: 1 }))

        const tables = await repo.findByRestaurantId('r1')
        expect(tables.map(t => t.number)).toEqual([1, 2, 3])
        expect(tables.every(t => t.restaurantId === 'r1')).toBe(true)
    })

    it('busca una mesa por número dentro del restaurante', async () => {
        expect((await repo.findByNumber('r1', 2))?.id).toBe('t3')
        expect((await repo.findByNumber('r2', 1))?.id).toBe('t-r2')
        expect(await repo.findByNumber('r1', 99)).toBeNull()
    })

    it('actualiza una mesa existente', async () => {
        await repo.save(buildTable({ id: 't1', number: 7, description: null, capacity: 6, status: 'reservada', updatedAt: 'later' }))

        const found = await repo.findById('t1')
        expect(found).toMatchObject({ number: 7, description: null, capacity: 6, status: 'reservada', updatedAt: 'later', createdAt: now })
    })

    it('borra una mesa', async () => {
        await repo.delete('t1')
        expect(await repo.findById('t1')).toBeNull()
    })

    describe('findAvailable', () => {
        beforeAll(async () => {
            await repo.save(buildTable({ id: 'a1', restaurantId: 'r3', number: 10, capacity: 6 }))
            await repo.save(buildTable({ id: 'a2', restaurantId: 'r3', number: 5, capacity: 4 }))
            await repo.save(buildTable({ id: 'a3', restaurantId: 'r3', number: 3, capacity: 4 }))
            await repo.save(buildTable({ id: 'a4', restaurantId: 'r3', number: 4, capacity: 2 }))
            await repo.save(buildTable({ id: 'a5', restaurantId: 'r3', number: 6, capacity: 8, status: 'ocupada' }))
            await repo.save(buildTable({ id: 'a6', restaurantId: 'r3', number: 7, capacity: 8, status: 'reservada' }))
        })

        it('devuelve solo mesas libres con capacidad suficiente, por capacidad y número', async () => {
            const tables = await repo.findAvailable('r3', 3)
            expect(tables.map(t => t.id)).toEqual(['a3', 'a2', 'a1'])
        })

        it('no devuelve mesas de otros restaurantes', async () => {
            const tables = await repo.findAvailable('r1', 1)
            expect(tables.every(t => t.restaurantId === 'r1')).toBe(true)
        })
    })

    describe('occupyIfFree', () => {
        it('ocupa una mesa libre y devuelve true', async () => {
            await repo.save(buildTable({ id: 'o1', restaurantId: 'r1', number: 50 }))

            expect(await repo.occupyIfFree('o1')).toBe(true)
            const found = await repo.findById('o1')
            expect(found?.status).toBe('ocupada')
            expect(found?.updatedAt).not.toBe(now)
        })

        it('devuelve false si la mesa ya está ocupada', async () => {
            expect(await repo.occupyIfFree('o1')).toBe(false)
        })

        it('devuelve false si la mesa está reservada', async () => {
            await repo.save(buildTable({ id: 'o2', restaurantId: 'r1', number: 51, status: 'reservada' }))
            expect(await repo.occupyIfFree('o2')).toBe(false)
            expect((await repo.findById('o2'))?.status).toBe('reservada')
        })

        it('devuelve false si la mesa no existe', async () => {
            expect(await repo.occupyIfFree('no-existe')).toBe(false)
        })
    })
})
