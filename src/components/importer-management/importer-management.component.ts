import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImporterService, Importer } from '../../services/importer.service';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-importer-management',
  templateUrl: './importer-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class ImporterManagementComponent {
  closeView = output<void>();
  
  // FIX: Removed FormBuilder injection as it was causing type errors. Forms are now created directly.
  importerService = inject(ImporterService);
  confirmationService = inject(ConfirmationService);
  
  importers = this.importerService.importers;
  
  newImporterForm: FormGroup;

  constructor() {
    // FIX: Replaced `this.fb.group` with `new FormGroup` and `new FormControl`.
    this.newImporterForm = new FormGroup({
      crNumber: new FormControl('', [Validators.required, Validators.pattern('^[0-9]+$')]),
      name: new FormControl('', Validators.required),
      phone: new FormControl('', Validators.required),
      email: new FormControl('', [Validators.required, Validators.email]),
      address: new FormControl('', Validators.required),
      activityType: new FormControl('', Validators.required),
    });
  }

  onClose(): void {
    this.closeView.emit();
  }

  addImporter(): void {
    if (this.newImporterForm.valid) {
      this.importerService.addImporter(this.newImporterForm.value);
      this.newImporterForm.reset();
    }
  }

  deleteImporter(importer: Importer): void {
    if (importer && importer.id) {
      this.confirmationService.request(
        'تأكيد حذف الشركة',
        `هل أنت متأكد من رغبتك في حذف شركة "${importer.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
        () => {
          if (importer.id) {
            this.importerService.deleteImporter(importer.id);
          }
        }
      );
    }
  }
}
