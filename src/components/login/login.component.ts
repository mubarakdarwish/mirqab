import { Component, ChangeDetectionStrategy, output, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService, User } from '../../services/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, OnDestroy {
  loginSuccess = output<User>();

  // FIX: Removed FormBuilder injection as it was causing type errors. Forms are now created directly.
  private userService = inject(UserService);

  loginForm: FormGroup;
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);
  passwordVisible = signal(false);

  private readonly backgroundImages = [
    'https://picsum.photos/seed/nature-forest/1920/1080',
    'https://picsum.photos/seed/nature-mountains/1920/1080',
    'https://picsum.photos/seed/nature-ocean/1920/1080',
    'https://picsum.photos/seed/nature-desert/1920/1080',
    'https://picsum.photos/seed/nature-aurora/1920/1080'
  ];
  currentBackground = signal(this.backgroundImages[0]);
  private backgroundInterval: any;

  constructor() {
    // FIX: Replaced `this.fb.group` with `new FormGroup` and `new FormControl`.
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', Validators.required),
    });
  }

  ngOnInit(): void {
    let currentIndex = 0;
    this.backgroundInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % this.backgroundImages.length;
      this.currentBackground.set(this.backgroundImages[currentIndex]);
    }, 10000); // Change every 10 seconds
  }

  ngOnDestroy(): void {
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update(v => !v);
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const { email, password } = this.loginForm.value;

      const user = await this.userService.login(email, password);
      if (user) {
        this.loginSuccess.emit(user);
      } else {
        this.errorMessage.set('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        this.isLoading.set(false);
      }
      // No need to set isLoading to false on success, as the component will be destroyed.
    }
  }
}