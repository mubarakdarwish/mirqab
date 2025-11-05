import { Component, ChangeDetectionStrategy, input, output, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { Sector } from '../../app.component';
import { TransactionService } from '../../services/transaction.service';
import { UserService } from '../../services/user.service';
import { DropdownDataService } from '../../services/dropdown-data.service';

@Component({
  selector: 'app-quarantine-dashboard',
  standalone: true,
  templateUrl: './quarantine-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe]
})
export class QuarantineDashboardComponent {
  sectorData = input.required<Sector>();
  registerImport = output<void>();

  private transactionService = inject(TransactionService);
  private userService = inject(UserService);
  private dropdownDataService = inject(DropdownDataService);

  sectorTransactions = computed(() => {
    const allTransactions = this.transactionService.transactions();
    const currentSectorId = this.sectorData().id;
    const sectorFiltered = allTransactions.filter(t => t.sectorId === currentSectorId);

    const user = this.userService.currentUser();
    if (!user || user.roles.includes('admin')) {
      return sectorFiltered;
    }
    
    const allPorts = this.dropdownDataService.data().ports;
    const allowedPortValues = new Set(
      allPorts
        .filter(port => user.permissions.allowedPorts.includes(port.key))
        .map(port => port.value)
    );

    return sectorFiltered.filter(t => allowedPortValues.has(t.portOfEntry));
  });

  totalTransactions = computed(() => this.sectorTransactions().length);
  
  nonCompliantCount = computed(() => 
    this.sectorTransactions().filter(t => t.inspectionResult === 'non-compliant').length
  );
  
  totalFees = computed(() => 
    this.sectorTransactions().reduce((acc, t) => acc + Number(t.fees || 0), 0)
  );
  
  averageWeight = computed(() => {
    const transactions = this.sectorTransactions();
    if (transactions.length === 0) {
      return 0;
    }
    const totalWeight = transactions.reduce((acc, t) => {
        const transactionTotalWeight = t.commodities.reduce((commAcc, comm) => commAcc + Number(comm.weight || 0), 0);
        return acc + transactionTotalWeight;
    }, 0);
    return totalWeight / transactions.length;
  });

  readonly finalActionMap: { [key: string]: string } = {
    'release': 'إفراج',
    'reject': 'رفض',
    'destroy': 'إتلاف',
    're-export': 'إعادة تصدير'
  };

  onRegisterImportClick(): void {
    this.registerImport.emit();
  }
}