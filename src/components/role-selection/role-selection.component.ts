import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { User, Role } from '../../services/user.service';

@Component({
  selector: 'app-role-selection',
  standalone: true,
  templateUrl: './role-selection.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleSelectionComponent {
  user = input.required<User>();
  roleSelected = output<Role>();

  // FIX: Added missing roles to fix type error.
  readonly roleMap: { [key in Role]: string } = {
    admin: 'مدير النظام',
    head_of_section: 'رئيس قسم للمنفذ',
    inspector: 'مفتش',
    data_entry: 'مدخل بيانات',
    laboratory: 'مختبر'
  };

  selectRole(role: Role): void {
    this.roleSelected.emit(role);
  }
}