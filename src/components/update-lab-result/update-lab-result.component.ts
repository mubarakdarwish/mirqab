import { Component, ChangeDetectionStrategy, inject, input, output, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DropdownDataService } from '../../services/dropdown-data.service';
import { Transaction } from '../../services/transaction.service';

@Component({
  selector: 'app-update-lab-result',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './update-lab-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateLabResultComponent implements OnInit {
  transaction = input.required<Transaction>();
  close = output<void>();
  resultUpdated = output<string>();
  
  private dropdownService = inject(DropdownDataService);
  labResults = this.dropdownService.data().labResults;

  updateForm!: FormGroup;

  ngOnInit(): void {
    this.updateForm = new FormGroup({
      labResult: new FormControl(this.transaction().labResult || '', Validators.required),
    });
  }

  onSubmit(): void {
    if (this.updateForm.valid) {
      this.resultUpdated.emit(this.updateForm.value.labResult);
    }
  }

  onClose(): void {
    this.close.emit();
  }
}