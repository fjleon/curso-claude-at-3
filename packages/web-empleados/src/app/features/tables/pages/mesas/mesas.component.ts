import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { TABLE_STATUSES, TableStatus } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);

  readonly statuses = TABLE_STATUSES;

  private get restaurantId(): string | null {
    return this.authStore.user()?.restaurantId ?? null;
  }

  ngOnInit(): void {
    const restaurantId = this.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
  }

  onStatusChange(tableId: string, event: Event): void {
    const restaurantId = this.restaurantId;
    if (!restaurantId) return;
    const status = (event.target as HTMLSelectElement).value as TableStatus;
    this.tableStore.changeStatus(restaurantId, tableId, status);
  }
}
