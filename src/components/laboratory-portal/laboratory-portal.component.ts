import { Component, ChangeDetectionStrategy, inject, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, UserService } from '../../services/user.service';
import { Transaction, TransactionService } from '../../services/transaction.service';
import { UpdateLabResultComponent } from '../update-lab-result/update-lab-result.component';

@Component({
  selector: 'app-laboratory-portal',
  standalone: true,
  imports: [CommonModule, UpdateLabResultComponent],
  templateUrl: './laboratory-portal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaboratoryPortalComponent {
  user = input.required<User>();
  logout = output<void>();

  private transactionService = inject(TransactionService);

  labSamples = computed(() => {
    const labName = this.user().laboratoryName;
    if (!labName) return [];
    return this.transactionService.transactions().filter(t => t.laboratoryName === labName);
  });

  selectedSample = signal<Transaction | null>(null);

  onLogout(): void {
    this.logout.emit();
  }

  openUpdateModal(sample: Transaction): void {
    this.selectedSample.set(sample);
  }

  closeUpdateModal(): void {
    this.selectedSample.set(null);
  }

  onResultUpdated(newResult: string): void {
    const sample = this.selectedSample();
    if (sample && sample.id) {
      this.transactionService.updateLabResult(sample.id, newResult);
    }
    this.closeUpdateModal();
  }
}