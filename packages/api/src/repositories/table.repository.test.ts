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

        for (const id of ['r1', 'r2']) {
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
})
