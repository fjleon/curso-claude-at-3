import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import type { Express } from 'express'
import type { Database } from '@config/database.js'

process.env.NODE_ENV = 'test'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'
const token = (role: string) => `Bearer ${jwt.sign({ id: `u-${role}`, role }, JWT_SECRET)}`

const PRIVATE = '/api/v1/restaurants/r1/tables'
const PUBLIC = '/api/v1/public/restaurants/r1/tables'

describe('Rutas de mesas (HTTP)', () => {
    let app: Express
    let db: Database

    beforeAll(async () => {
        const database = await import('@config/database.js')
        db = database.dbConfig
        await db.initialize()
        app = (await import('../app.js')).default
        const now = new Date().toISOString()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', now, now]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    describe('privadas', () => {
        let tableId: string

        it('POST como admin crea la mesa (201) y repetir número da 409', async () => {
            const res = await request(app).post(PRIVATE).set('Authorization', token('admin')).send({ number: 10, capacity: 4 })
            expect(res.status).toBe(201)
            expect(res.body).toMatchObject({ restaurantId: 'r1', number: 10, capacity: 4, description: null, status: 'libre' })
            tableId = res.body.id

            const dup = await request(app).post(PRIVATE).set('Authorization', token('admin')).send({ number: 10, capacity: 2 })
            expect(dup.status).toBe(409)
            expect(dup.body).toEqual({ error: 'DuplicatedTableNumberError', message: 'Ya existe una mesa con ese número en este restaurante' })
        })

        it('POST con capacidad <= 0 da 400 y en un restaurante inexistente da 404', async () => {
            const bad = await request(app).post(PRIVATE).set('Authorization', token('admin')).send({ number: 11, capacity: 0 })
            expect(bad.status).toBe(400)
            expect(bad.body.error).toBe('InvalidCapacityError')

            const noRest = await request(app).post('/api/v1/restaurants/no-existe/tables').set('Authorization', token('admin')).send({ number: 1, capacity: 2 })
            expect(noRest.status).toBe(404)
            expect(noRest.body.error).toBe('RestaurantNotFoundError')
        })

        it('sin token da 401', async () => {
            const res = await request(app).get(PRIVATE)
            expect(res.status).toBe(401)
        })

        it.each(['cocinero', 'camarero', 'manager', 'cliente'])('%s no puede crear, modificar ni borrar (403)', async (role) => {
            expect((await request(app).post(PRIVATE).set('Authorization', token(role)).send({ number: 20, capacity: 2 })).status).toBe(403)
            expect((await request(app).put(`${PRIVATE}/${tableId}`).set('Authorization', token(role)).send({ number: 10, capacity: 2 })).status).toBe(403)
            const del = await request(app).delete(`${PRIVATE}/${tableId}`).set('Authorization', token(role))
            expect(del.status).toBe(403)
            expect(del.body).toEqual({ error: 'Forbidden: Insufficient permissions' })
        })

        it.each(['admin', 'manager', 'camarero', 'cocinero'])('%s puede listar, ver y cambiar el estado', async (role) => {
            const list = await request(app).get(PRIVATE).set('Authorization', token(role))
            expect(list.status).toBe(200)
            expect(Array.isArray(list.body)).toBe(true)

            expect((await request(app).get(`${PRIVATE}/${tableId}`).set('Authorization', token(role))).status).toBe(200)

            const patch = await request(app).patch(`${PRIVATE}/${tableId}/status`).set('Authorization', token(role)).send({ status: 'reservada' })
            expect(patch.status).toBe(200)
            expect(patch.body.status).toBe('reservada')
        })

        it('cliente no puede ver ni cambiar estado (403)', async () => {
            expect((await request(app).get(PRIVATE).set('Authorization', token('cliente'))).status).toBe(403)
            expect((await request(app).patch(`${PRIVATE}/${tableId}/status`).set('Authorization', token('cliente')).send({ status: 'libre' })).status).toBe(403)
        })

        it('PATCH status inválido da 400 y mesa inexistente da 404', async () => {
            const bad = await request(app).patch(`${PRIVATE}/${tableId}/status`).set('Authorization', token('admin')).send({ status: 'rota' })
            expect(bad.status).toBe(400)
            expect(bad.body.error).toBe('InvalidTableStatusError')

            const missing = await request(app).get(`${PRIVATE}/no-existe`).set('Authorization', token('admin'))
            expect(missing.status).toBe(404)
            expect(missing.body).toEqual({ error: 'TableNotFoundError', message: 'Mesa no encontrada' })
        })

        it('PUT como admin actualiza (200)', async () => {
            const res = await request(app).put(`${PRIVATE}/${tableId}`).set('Authorization', token('admin')).send({ number: 10, capacity: 6, description: 'Terraza' })
            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ number: 10, capacity: 6, description: 'Terraza', status: 'reservada' })
        })

        it('DELETE de una mesa ocupada da 409 y de una libre 204', async () => {
            await request(app).patch(`${PRIVATE}/${tableId}/status`).set('Authorization', token('admin')).send({ status: 'ocupada' })
            const occupied = await request(app).delete(`${PRIVATE}/${tableId}`).set('Authorization', token('admin'))
            expect(occupied.status).toBe(409)
            expect(occupied.body.error).toBe('TableOccupiedError')

            await request(app).patch(`${PRIVATE}/${tableId}/status`).set('Authorization', token('admin')).send({ status: 'libre' })
            const ok = await request(app).delete(`${PRIVATE}/${tableId}`).set('Authorization', token('admin'))
            expect(ok.status).toBe(204)
            expect(ok.text).toBe('')
        })
    })

    describe('públicas (cliente)', () => {
        let freeId: string

        beforeAll(async () => {
            const admin = token('admin')
            const caps: Array<[number, number, string?]> = [[1, 2], [2, 4], [3, 4], [4, 6], [5, 8, 'ocupada'], [6, 8, 'reservada']]
            for (const [number, capacity, status] of caps) {
                const res = await request(app).post(PRIVATE).set('Authorization', admin).send({ number, capacity, status })
                if (number === 2) freeId = res.body.id
            }
        })

        it('sin token da 401', async () => {
            expect((await request(app).get(`${PUBLIC}?people=3`)).status).toBe(401)
            expect((await request(app).post(`${PUBLIC}/${freeId}/occupy`)).status).toBe(401)
        })

        it('lista las mesas libres con capacidad suficiente, ordenadas', async () => {
            const res = await request(app).get(`${PUBLIC}?people=3`).set('Authorization', token('cliente'))
            expect(res.status).toBe(200)
            expect(res.body.map((t: { number: number }) => t.number)).toEqual([2, 3, 4])
        })

        it.each(['?people=0', '?people=abc', ''])('people inválido o ausente (%s) da 400', async (qs) => {
            const res = await request(app).get(`${PUBLIC}${qs}`).set('Authorization', token('cliente'))
            expect(res.status).toBe(400)
            expect(res.body.error).toBe('InvalidPeopleError')
        })

        it('occupy da 200 con la mesa ocupada y la segunda vez 409', async () => {
            const first = await request(app).post(`${PUBLIC}/${freeId}/occupy`).set('Authorization', token('cliente'))
            expect(first.status).toBe(200)
            expect(first.body).toMatchObject({ id: freeId, status: 'ocupada' })

            const second = await request(app).post(`${PUBLIC}/${freeId}/occupy`).set('Authorization', token('cliente'))
            expect(second.status).toBe(409)
            expect(second.body).toEqual({ error: 'TableNotAvailableError', message: 'La mesa ya no está disponible' })
        })

        it('occupy de una mesa inexistente da 404', async () => {
            const res = await request(app).post(`${PUBLIC}/no-existe/occupy`).set('Authorization', token('cliente'))
            expect(res.status).toBe(404)
        })
    })
})
