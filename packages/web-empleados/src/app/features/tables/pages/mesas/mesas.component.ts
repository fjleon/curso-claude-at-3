import { Component, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { OrderStore } from '../../../orders/store/order.store';
import { TableStore } from '../../store/table.store';
import { Order } from '../../../orders/models/order.model';
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

  readonly orderStore = inject(OrderStore);

  readonly statuses = TABLE_STATUSES;

  /** Pedidos activos (con items no entregados) agrupados por id de mesa. */
  readonly activeOrdersByTable = computed(() => {
    const map = new Map<string, Order[]>();
    for (const order of this.orderStore.orders()) {
      if (!order.tableId) continue;
      const items = order.items.filter(item => item.status !== 'entregado');
      if (items.length === 0) continue;
      const list = map.get(order.tableId) ?? [];
      list.push({ ...order, items });
      map.set(order.tableId, list);
    }
    return map;
  });

  private get restaurantId(): string | null {
    return this.authStore.user()?.restaurantId ?? null;
  }

  ngOnInit(): void {
    const restaurantId = this.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
      this.orderStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
    this.orderStore.stopPolling();
  }

  onStatusChange(tableId: string, event: Event): void {
    const restaurantId = this.restaurantId;
    if (!restaurantId) return;
    const status = (event.target as HTMLSelectElement).value as TableStatus;
    this.tableStore.changeStatus(restaurantId, tableId, status);
  }
}
