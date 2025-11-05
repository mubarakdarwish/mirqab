import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { UserService } from '../../services/user.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
  passwordChanged = output<void>();

  // FIX: Removed FormBuilder injection as it was causing type errors. Forms are now created directly.
  private userService = inject(UserService);

  changePasswordForm: FormGroup;
  errorMessage = signal<string | null>(null);

  constructor() {
    // FIX: Replaced `this.fb.group` with `new FormGroup` and `new FormControl`.
    this.changePasswordForm = new FormGroup({
      newPassword: new FormControl('', [Validators.required, Validators.minLength(8)]),
      confirmPassword: new FormControl('', Validators.required),
    }, { validators: passwordsMatchValidator });
  }

  onSubmit(): void {
    if (this.changePasswordForm.valid) {
      const { newPassword } = this.changePasswordForm.value;
      this.userService.changePassword(newPassword);
      this.passwordChanged.emit();
    } else {
        this.errorMessage.set(null); // Clear previous message
        if(this.changePasswordForm.hasError('passwordsMismatch')) {
            this.errorMessage.set('كلمتا المرور غير متطابقتين.');
        } else if (this.changePasswordForm.get('newPassword')?.hasError('minlength')) {
            this.errorMessage.set('يرجى التأكد من أن كلمة المرور لا تقل عن 8 أحرف.');
        } else {
            this.errorMessage.set('يرجى تعبئة جميع الحقول بشكل صحيح.');
        }
    }
  }
}
