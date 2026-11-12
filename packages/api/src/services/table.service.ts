import { randomUUID } from 'crypto'
import type { Table, TableStatusType } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    DuplicatedTableNumberError,
    InvalidCapacityError,
    InvalidTableNumberError,
    RestaurantNotFoundError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    restaurantId: string
    number: number
    capacity: number
    description?: string | null
    status?: string
}

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        const number = this.validateNumber(dto.number)
        const capacity = this.validateCapacity(dto.capacity)
        const status: TableStatusType = dto.status === undefined ? 'libre' : normalizeTableStatus(dto.status)

        const restaurant = await this.restaurantRepository.findById(dto.restaurantId)
        if (!restaurant) {
            throw new RestaurantNotFoundError()
        }

        if (await this.tableRepository.findByNumber(dto.restaurantId, number)) {
            throw new DuplicatedTableNumberError()
        }

        const now = new Date().toISOString()
        const table: Table = {
            id: randomUUID(),
            restaurantId: dto.restaurantId,
            number,
            description: this.normalizeDescription(dto.description),
            capacity,
            status,
            createdAt: now,
            updatedAt: now
        }

        await this.tableRepository.save(table)
        return table
    }

    private validateNumber(value: unknown): number {
        if (!this.isPositiveInteger(value)) {
            throw new InvalidTableNumberError()
        }
        return value
    }

    private validateCapacity(value: unknown): number {
        if (!this.isPositiveInteger(value)) {
            throw new InvalidCapacityError()
        }
        return value
    }

    private isPositiveInteger(value: unknown): value is number {
        return typeof value === 'number' && Number.isInteger(value) && value > 0
    }

    private normalizeDescription(value: unknown): string | null {
        if (typeof value !== 'string') return null
        const trimmed = value.trim()
        return trimmed === '' ? null : trimmed
    }
}
