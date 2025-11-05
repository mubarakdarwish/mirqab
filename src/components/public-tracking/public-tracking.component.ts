import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Transaction, TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-public-tracking',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './public-tracking.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicTrackingComponent {
  returnToLogin = output<void>();

  private transactionService = inject(TransactionService);

  searchForm: FormGroup;
  isLoading = signal(false);
  searched = signal(false);
  transaction = signal<Transaction | null>(null);
  
  readonly finalActionMap: { [key: string]: string } = {
    'release': 'إفراج',
    'reject': 'رفض',
    'destroy': 'إتلاف',
    're-export': 'إعادة تصدير'
  };

  constructor() {
    this.searchForm = new FormGroup({
      declarationNumber: new FormControl('', Validators.required),
    });
  }

  async onSearch(): Promise<void> {
    if (this.searchForm.valid) {
      this.isLoading.set(true);
      this.searched.set(true);
      this.transaction.set(null);
      const declarationNumber = this.searchForm.value.declarationNumber;
      const result = await this.transactionService.findByCustomsDeclaration(declarationNumber);
      this.transaction.set(result);
      this.isLoading.set(false);
    }
  }

  onReturn(): void {
    this.returnToLogin.emit();
  }
}