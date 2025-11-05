import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommodityService } from '../../services/commodity.service';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-commodity-management',
  templateUrl: './commodity-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class CommodityManagementComponent {
  closeView = output<void>();
  
  // FIX: Removed FormBuilder injection as it was causing type errors. Forms are now created directly.
  commodityService = inject(CommodityService);
  confirmationService = inject(ConfirmationService);
  
  groups = this.commodityService.groups;
  
  newGroupForm: FormGroup;
  newCommodityForms: { [key: string]: FormGroup } = {};

  constructor() {
    // FIX: Replaced `this.fb.group` with `new FormGroup` and `new FormControl`.
    this.newGroupForm = new FormGroup({
      name: new FormControl('', Validators.required),
    });

    this.groups().forEach(group => {
      this.initCommodityFormForGroup(group.name);
    });
  }

  private initCommodityFormForGroup(groupName: string): void {
    // FIX: Replaced `this.fb.group` with `new FormGroup` and `new FormControl`.
    this.newCommodityForms[groupName] = new FormGroup({
      name: new FormControl('', Validators.required)
    });
  }

  onClose(): void {
    this.closeView.emit();
  }

  addGroup(): void {
    if (this.newGroupForm.valid) {
      const groupName = this.newGroupForm.value.name;
      this.commodityService.addGroup(groupName);
      this.initCommodityFormForGroup(groupName);
      this.newGroupForm.reset();
    }
  }

  deleteGroup(groupName: string): void {
    this.confirmationService.request(
      'تأكيد حذف المجموعة',
      `هل أنت متأكد من رغبتك في حذف مجموعة "${groupName}" وكل السلع المرتبطة بها؟`,
      () => {
        this.commodityService.deleteGroup(groupName);
        delete this.newCommodityForms[groupName];
      }
    );
  }

  addCommodity(groupName: string): void {
    const form = this.newCommodityForms[groupName];
    if (form && form.valid) {
      const commodityName = form.value.name;
      this.commodityService.addCommodityToGroup(groupName, commodityName);
      form.reset();
    }
  }

  deleteCommodity(groupName: string, commodityName: string): void {
    this.confirmationService.request(
      'تأكيد حذف السلعة',
      `هل أنت متأكد من رغبتك في حذف سلعة "${commodityName}" من مجموعة "${groupName}"؟`,
      () => {
        this.commodityService.deleteCommodity(groupName, commodityName);
      }
    );
  }
}