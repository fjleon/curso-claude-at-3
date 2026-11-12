import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import type { TableStatus } from '../../models/table.model'

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.css'
})
export class TableListComponent implements OnInit {
  readonly store = inject(TableStore)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  restaurantId = ''
  deleteError = signal<string | null>(null)

  ngOnInit(): void {
    // Angular reutiliza el componente al cambiar solo el restaurantId: hay que reaccionar al paramMap
    this.route.parent?.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.restaurantId = params.get('restaurantId') ?? ''
      this.deleteError.set(null)
      if (this.restaurantId) {
        this.store.loadByRestaurant(this.restaurantId)
      }
    })
  }

  statusLabel(status: TableStatus): string {
    return { libre: 'Libre', ocupada: 'Ocupada', reservada: 'Reservada' }[status]
  }

  async onDelete(id: string, number: number): Promise<void> {
    if (!this.restaurantId) return
    if (!confirm(`¿Estás seguro de eliminar la mesa ${number}?`)) return
    this.deleteError.set(null)
    try {
      await this.store.delete(this.restaurantId, id)
    } catch (err: any) {
      this.deleteError.set(err?.error?.message ?? err?.error?.error ?? 'Error al eliminar la mesa.')
    }
  }
}
