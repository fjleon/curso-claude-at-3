import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { HttpErrorResponse } from '@angular/common/http'
import { TableService } from '../../core/services/table.service'
import { RestaurantService } from '../../core/services/restaurant.service'
import { CartStore } from '../../core/store/cart.store'
import { Table } from '../../core/models/table.model'
import { Restaurant } from '../../core/models/restaurant.model'

@Component({
  selector: 'app-select-table',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>{{ restaurant()?.name || 'Elige tu mesa' }}</h1>
          <p>Indica cuántas personas sois y elige una mesa libre</p>
        </div>
      </div>

      <div class="card search-card">
        <div class="form-group">
          <label for="people">Número de personas</label>
          <input id="people" type="number" min="1" step="1" [ngModel]="people()" (ngModelChange)="people.set($event)" />
        </div>
        <button class="btn btn-primary" [disabled]="loading()" (click)="search()">Buscar mesas</button>
      </div>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }
      @if (notice()) {
        <div class="alert-error">{{ notice() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state card">
            <p>No hay mesas libres para {{ searchedPeople() }} {{ searchedPeople() === 1 ? 'persona' : 'personas' }}</p>
          </div>
        } @else {
          <div class="tables-grid">
            @for (table of tables(); track table.id) {
              <button type="button" class="table-card card" [class.selected]="selected()?.id === table.id" (click)="selected.set(table)">
                <strong>Mesa {{ table.number }}</strong>
                <span class="capacity">Hasta {{ table.capacity }} personas</span>
                @if (table.description) {
                  <span class="description">{{ table.description }}</span>
                }
              </button>
            }
          </div>
          <div class="actions">
            <button class="btn btn-primary" [disabled]="!selected() || occupying()" (click)="continue()">
              @if (occupying()) { Reservando mesa... } @else { Continuar }
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .back-link {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: inline-block;
    }
    .search-card {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 20px;
    }
    .search-card .form-group {
      margin: 0;
      flex: 1;
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .table-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 16px 20px;
      text-align: left;
      color: var(--text-primary);
      cursor: pointer;
      transition: all var(--transition);
    }
    .table-card:hover,
    .table-card.selected {
      border-color: var(--green-medium);
    }
    .table-card.selected {
      background: var(--green-glow);
    }
    .capacity {
      color: var(--green-light);
      font-size: 13px;
    }
    .description {
      color: var(--text-muted);
      font-size: 13px;
    }
    .actions {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class SelectTableComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly restaurantService = inject(RestaurantService)
  private readonly cartStore = inject(CartStore)

  private restaurantId = ''

  readonly restaurant = signal<Restaurant | null>(null)
  readonly people = signal<number | null>(2)
  readonly searchedPeople = signal(0)
  readonly tables = signal<Table[]>([])
  readonly selected = signal<Table | null>(null)
  readonly searched = signal(false)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly error = signal<string | null>(null)
  readonly notice = signal<string | null>(null)

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!
    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (restaurant) => this.restaurant.set(restaurant),
      error: () => {}
    })
  }

  search(): void {
    this.notice.set(null)
    this.load(this.people())
  }

  private load(people: number | null): void {
    if (!Number.isInteger(people) || (people as number) < 1) {
      this.error.set('Indica un número de personas entero mayor que 0')
      return
    }
    this.error.set(null)
    this.loading.set(true)
    this.selected.set(null)
    this.tableService.getAvailable(this.restaurantId, people as number).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.searchedPeople.set(people as number)
        this.searched.set(true)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }

  continue(): void {
    const table = this.selected()
    if (!table) return
    this.occupying.set(true)
    this.error.set(null)
    this.notice.set(null)
    this.tableService.occupy(this.restaurantId, table.id).subscribe({
      next: (occupied) => {
        this.cartStore.setTable(this.restaurantId, occupied)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err: HttpErrorResponse) => {
        this.occupying.set(false)
        if (err.status === 409) {
          this.notice.set(`La mesa ${table.number} ya no está disponible. Elige otra.`)
          this.load(this.searchedPeople())
        } else {
          this.error.set('No se pudo ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }
}
