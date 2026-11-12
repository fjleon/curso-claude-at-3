import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from './database.js'

describe('Database — migración restaurant_tables', () => {
    let db: Database
    const now = new Date().toISOString()

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', now, now]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    it('crea la tabla con estado libre por defecto', async () => {
        await db.run(
            'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['t1', 'r1', 1, null, 4, now, now]
        )
        const row = await db.get<{ status: string }>('SELECT status FROM restaurant_tables WHERE id = ?', ['t1'])
        expect(row?.status).toBe('libre')
    })

    it('impide repetir el número de mesa en el mismo restaurante', async () => {
        await expect(db.run(
            'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['t2', 'r1', 1, null, 2, now, now]
        )).rejects.toThrow(/UNIQUE/)
    })

    it('exige que el restaurante exista', async () => {
        await expect(db.run(
            'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['t3', 'no-existe', 1, null, 2, now, now]
        )).rejects.toThrow(/FOREIGN KEY/)
    })
})
