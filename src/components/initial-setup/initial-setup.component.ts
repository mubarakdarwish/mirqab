import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService, User } from '../../services/user.service';
import { DropdownDataService } from '../../services/dropdown-data.service';

@Component({
  selector: 'app-initial-setup',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './initial-setup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitialSetupComponent {
  private userService = inject(UserService);
  private dropdownService = inject(DropdownDataService);

  setupForm: FormGroup;
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  constructor() {
    this.setupForm = new FormGroup({
      name: new FormControl('', Validators.required),
      email: new FormControl('', [Validators.required, Validators.email]),
      civilId: new FormControl('', [Validators.required, Validators.pattern('^[0-9]+$')]),
      phone: new FormControl('', [Validators.required, Validators.pattern('^[0-9]+$')]),
      jobTitle: new FormControl('', Validators.required),
    });
  }

  async onSubmit(): Promise<void> {
    if (this.setupForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const formValue = this.setupForm.value;

      const adminUserData: Omit<User, 'uid' | 'hasChangedDefaultPassword'> = {
        name: formValue.name,
        email: formValue.email,
        civilId: formValue.civilId,
        phone: formValue.phone,
        jobTitle: formValue.jobTitle,
        roles: ['admin'],
        permissions: {
          allowedPorts: this.dropdownService.data().ports.map(p => p.key),
          allowedSectors: ['agricultural', 'veterinary', 'food_safety'],
        },
      };

      const result = await this.userService.addUser(adminUserData);
      
      if (result.success) {
        alert('تم إنشاء حساب المدير بنجاح! يمكنك الآن تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور الافتراضية (20252025).');
        // The app will automatically switch to the login screen because `isInitialSetupNeeded` will become false.
      } else {
        this.errorMessage.set(result.error || 'حدث خطأ غير متوقع.');
        this.isLoading.set(false);
      }
    }
  }
}