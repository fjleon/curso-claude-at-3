import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'

interface TableRow {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: string
    createdAt: string
    updatedAt: string
}

const SELECT_COLUMNS = `
    SELECT id, restaurant_id as restaurantId, number, description, capacity, status,
           created_at as createdAt, updated_at as updatedAt
    FROM restaurant_tables`

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    findByRestaurantId(restaurantId: string): Promise<Table[]>
    findByNumber(restaurantId: string, number: number): Promise<Table | null>
    save(table: Table): Promise<void>
    delete(id: string): Promise<void>
    findAvailable(restaurantId: string, minCapacity: number): Promise<Table[]>
    occupyIfFree(id: string): Promise<boolean>
}

export class SqliteTableRepository implements TableRepository {
    constructor(private readonly db: Database) {}

    async findById(id: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(`${SELECT_COLUMNS} WHERE id = ?`, [id])
        return row ? this.mapToTable(row) : null
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `${SELECT_COLUMNS} WHERE restaurant_id = ? ORDER BY number ASC`,
            [restaurantId]
        )
        return rows.map(row => this.mapToTable(row))
    }

    async findByNumber(restaurantId: string, number: number): Promise<Table | null> {
        const row = await this.db.get<TableRow>(
            `${SELECT_COLUMNS} WHERE restaurant_id = ? AND number = ?`,
            [restaurantId, number]
        )
        return row ? this.mapToTable(row) : null
    }

    async save(table: Table): Promise<void> {
        const existing = await this.findById(table.id)
        if (existing) {
            await this.db.run(
                'UPDATE restaurant_tables SET number = ?, description = ?, capacity = ?, status = ?, updated_at = ? WHERE id = ?',
                [table.number, table.description, table.capacity, table.status, table.updatedAt, table.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [table.id, table.restaurantId, table.number, table.description, table.capacity, table.status, table.createdAt, table.updatedAt]
            )
        }
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM restaurant_tables WHERE id = ?', [id])
    }

    async findAvailable(restaurantId: string, minCapacity: number): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `${SELECT_COLUMNS} WHERE restaurant_id = ? AND status = 'libre' AND capacity >= ? ORDER BY capacity ASC, number ASC`,
            [restaurantId, minCapacity]
        )
        return rows.map(row => this.mapToTable(row))
    }

    async occupyIfFree(id: string): Promise<boolean> {
        const result = await this.db.run(
            "UPDATE restaurant_tables SET status = 'ocupada', updated_at = ? WHERE id = ? AND status = 'libre'",
            [new Date().toISOString(), id]
        )
        return result.changes > 0
    }

    private mapToTable(row: TableRow): Table {
        return {
            id: row.id,
            restaurantId: row.restaurantId,
            number: row.number,
            description: row.description,
            capacity: row.capacity,
            status: normalizeTableStatus(row.status),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }
    }
}
