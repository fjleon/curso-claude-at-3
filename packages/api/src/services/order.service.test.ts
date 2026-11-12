import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import type { Table } from '@models/table.model.js'
import type { Order } from '@models/order.model.js'
import {
    OrderNotFoundError,
    InvalidOrderStatusError,
    TableNotFoundError,
    TableNotInRestaurantError,
    TableNotOccupiedError
} from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo, new MockTableRepository())

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create — validación de tableId', () => {
    let orders: MockOrderRepository
    let tables: MockTableRepository
    let service: OrderService

    const now = new Date().toISOString()
    const table = (overrides: Partial<Table>): Table => ({
        id: 'table-rest-1-5',
        restaurantId: 'rest-1',
        number: 5,
        description: null,
        capacity: 4,
        status: 'ocupada',
        createdAt: now,
        updatedAt: now,
        ...overrides
    })
    const request = (tableId: string | null) => ({
        restaurantId: 'rest-1',
        tableId,
        clientId: 'client-1',
        items: [{ dishId: 'dish-1', quantity: 2, notes: null }]
    })

    beforeEach(async () => {
        orders = new MockOrderRepository()
        tables = new MockTableRepository()
        service = new OrderService(orders, tables)
        await tables.save(table({}))
        await tables.save(table({ id: 'table-rest-1-1', number: 1, status: 'libre' }))
        await tables.save(table({ id: 'table-rest-1-2', number: 2, status: 'reservada' }))
        await tables.save(table({ id: 'table-rest-2-1', restaurantId: 'rest-2', number: 1 }))
    })

    it('crea el pedido asociado a una mesa ocupada del restaurante', async () => {
        const order = await service.create(request('table-rest-1-5'))

        expect(order.tableId).toBe('table-rest-1-5')
        expect(order.items).toHaveLength(2)
        expect(orders.orders).toHaveLength(1)
    })

    it('crea el pedido sin mesa si tableId es null', async () => {
        const order = await service.create(request(null))
        expect(order.tableId).toBeNull()
        expect(orders.orders).toHaveLength(1)
    })

    it('rechaza una mesa inexistente', async () => {
        await expect(service.create(request('no-existe'))).rejects.toThrow(TableNotFoundError)
        expect(orders.orders).toHaveLength(0)
    })

    it('rechaza una mesa de otro restaurante', async () => {
        await expect(service.create(request('table-rest-2-1'))).rejects.toThrow(TableNotInRestaurantError)
        await expect(service.create(request('table-rest-2-1'))).rejects.toThrow('La mesa no pertenece a este restaurante')
        expect(orders.orders).toHaveLength(0)
    })

    it.each(['table-rest-1-1', 'table-rest-1-2'])('rechaza una mesa que no está ocupada (%s)', async (tableId) => {
        await expect(service.create(request(tableId))).rejects.toThrow(TableNotOccupiedError)
        await expect(service.create(request(tableId))).rejects.toThrow('La mesa no está ocupada')
        expect(orders.orders).toHaveLength(0)
    })
})
