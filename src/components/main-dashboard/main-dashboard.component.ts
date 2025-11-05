import { Component, ChangeDetectionStrategy, input, output, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { Sector, SectorType } from '../../app.component';
import { UserService } from '../../services/user.service';
import { Transaction, TransactionService } from '../../services/transaction.service';
import { DropdownDataService } from '../../services/dropdown-data.service';


@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './main-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainDashboardComponent {
  sectors = input.required<Sector[]>();
  selectSector = output<SectorType>();

  private userService = inject(UserService);
  private transactionService = inject(TransactionService);
  private dropdownDataService = inject(DropdownDataService);

  isAdmin = computed(() => {
    const user = this.userService.currentUser();
    return !!user && user.roles.includes('admin');
  });

  private userVisibleTransactions = computed(() => {
    const user = this.userService.currentUser();
    const allTransactions = this.transactionService.transactions();
    const allPorts = this.dropdownDataService.data().ports;

    if (!user || user.roles.includes('admin')) {
      return allTransactions;
    }

    const allowedPortValues = new Set(
      allPorts
        .filter(port => user.permissions.allowedPorts.includes(port.key))
        .map(port => port.value)
    );
    const allowedSectors = new Set(user.permissions.allowedSectors);

    return allTransactions.filter(t => 
      allowedSectors.has(t.sectorId) && allowedPortValues.has(t.portOfEntry)
    );
  });
  
  private calculateStats(transactions: Transaction[]) {
    const totalTransactions = transactions.length;
    const totalFees = transactions.reduce((acc, t) => acc + Number(t.fees || 0), 0);
    const rejectedCount = transactions.filter(t => t.finalAction === 'reject' || t.finalAction === 'destroy').length;
    const pledgedCount = transactions.filter(t => t.pledge === 'yes' && t.pledgeFulfillment !== 'yes').length;
    return { totalTransactions, totalFees, rejectedCount, pledgedCount };
  }

  adminDashboardData = computed(() => {
    if (!this.isAdmin()) {
      return { byPort: [], bySector: [] };
    }

    const allTransactions = this.transactionService.transactions();
    const allPorts = this.dropdownDataService.data().ports;
    const allSectors = this.sectors();

    const byPort = allPorts.map(port => {
      const portTransactions = allTransactions.filter(t => t.portOfEntry === port.value);
      return {
        portName: port.value,
        stats: this.calculateStats(portTransactions)
      };
    });

    const bySector = allSectors.map(sector => {
      const sectorTransactions = allTransactions.filter(t => t.sectorId === sector.id);
      return {
        sectorTitle: sector.title,
        icon: sector.icon,
        stats: this.calculateStats(sectorTransactions)
      };
    });

    return { byPort, bySector };
  });

  // Stats for non-admins
  totalTransactions = computed(() => this.userVisibleTransactions().length);
  totalFees = computed(() => 
    this.userVisibleTransactions().reduce((acc, t) => acc + Number(t.fees || 0), 0)
  );
  rejectedCount = computed(() => 
    this.userVisibleTransactions().filter(t => t.finalAction === 'reject' || t.finalAction === 'destroy').length
  );
  pledgedCount = computed(() => 
    this.userVisibleTransactions().filter(t => t.pledge === 'yes' && t.pledgeFulfillment !== 'yes').length
  );

  onSectorSelect(sectorId: SectorType): void {
    this.selectSector.emit(sectorId);
  }
}
