import { Component, ChangeDetectionStrategy, output, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, FormArray, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { UserService, User, Role } from '../../services/user.service';
import { DropdownDataService } from '../../services/dropdown-data.service';
import type { Sector } from '../../app.component';
import { ImporterService } from '../../services/importer.service';

function minOneRoleValidator(): (control: AbstractControl) => ValidationErrors | null {
  return (formArray: AbstractControl): ValidationErrors | null => {
    const values = (formArray as FormArray).value as boolean[];
    const hasSelection = values.some(v => v);
    return hasSelection ? null : { requireOneRole: true };
  };
}


@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './user-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementComponent {
  closeView = output<void>();

  // FIX: Removed FormBuilder injection as it was causing type errors. Forms are now created directly.
  userService = inject(UserService);
  dropdownService = inject(DropdownDataService);
  importerService = inject(ImporterService);

  users = this.userService.users;
  allPorts = this.dropdownService.data().ports;
  allImporters = this.importerService.importers;
  allLaboratories = this.dropdownService.data().laboratories;
  
  allSectors: Pick<Sector, 'id' | 'title'>[] = [
    { id: 'agricultural', title: 'الحجر الزراعي' },
    { id: 'veterinary', title: 'الحجر البيطري' },
    { id: 'food_safety', title: 'سلامة الغذاء' }
  ];

  availableRoles: { key: Role, title: string }[] = [
    { key: 'admin', title: 'مدير النظام' },
    { key: 'head_of_section', title: 'رئيس قسم للمنفذ' },
    { key: 'inspector', title: 'مفتش' },
    { key: 'data_entry', title: 'مدخل بيانات' },
    { key: 'laboratory', title: 'مختبر' },
  ];

  userForm: FormGroup;
  editingUser = signal<User | null>(null);

  // Filters
  selectedPortFilter = signal<string>('');
  selectedSectorFilter = signal<string>('');
  
  showLaboratoryDropdown = computed(() => {
    const roles = this.userForm.value.roles;
    const labRoleIndex = this.availableRoles.findIndex(r => r.key === 'laboratory');
    return roles && roles[labRoleIndex];
  });

  filteredUsers = computed(() => {
    const users = this.users();
    const portFilter = this.selectedPortFilter();
    const sectorFilter = this.selectedSectorFilter();

    if (!portFilter && !sectorFilter) {
      return users;
    }

    return users.filter(user => {
      const portMatch = portFilter ? user.permissions.allowedPorts.includes(portFilter) : true;
      const sectorMatch = sectorFilter ? user.permissions.allowedSectors.includes(sectorFilter as any) : true;
      return portMatch && sectorMatch;
    });
  });

  constructor() {
    // FIX: Replaced `this.fb.group` and other builder methods with direct instantiation.
    this.userForm = new FormGroup({
      name: new FormControl('', Validators.required),
      email: new FormControl('', [Validators.required, Validators.email]),
      civilId: new FormControl('', [Validators.required, Validators.pattern('^[0-9]+$')]),
      phone: new FormControl('', [Validators.required, Validators.pattern('^[0-9]+$')]),
      jobTitle: new FormControl('', Validators.required),
      laboratoryName: new FormControl(''),
      roles: new FormArray(
        this.availableRoles.map(() => new FormControl(false)),
        [minOneRoleValidator()]
      ),
      allowedPorts: new FormArray(this.allPorts.map(() => new FormControl(false))),
      allowedSectors: new FormArray(this.allSectors.map(() => new FormControl(false))),
    });

    this.rolesFormArray.valueChanges.subscribe(values => {
        const labRoleIndex = this.availableRoles.findIndex(r => r.key === 'laboratory');
        const labRoleSelected = values[labRoleIndex];
        const labControl = this.userForm.get('laboratoryName');

        if(labRoleSelected) {
            labControl?.setValidators(Validators.required);
        } else {
            labControl?.clearValidators();
            labControl?.reset('');
        }
        labControl?.updateValueAndValidity();
    })
  }

  get rolesFormArray() {
    return this.userForm.get('roles') as FormArray;
  }

  get allowedPortsFormArray() {
    return this.userForm.get('allowedPorts') as FormArray;
  }

  get allowedSectorsFormArray() {
    return this.userForm.get('allowedSectors') as FormArray;
  }

  onClose(): void {
    this.closeView.emit();
  }

  async submitForm(): Promise<void> {
    this.userForm.markAllAsTouched();
    if (this.userForm.valid) {
      const formValue = this.userForm.getRawValue();
      
      const selectedRoles = formValue.roles
        .map((checked: boolean, i: number) => checked ? this.availableRoles[i].key : null)
        .filter(Boolean) as Role[];

      const selectedPorts = this.allPorts
        .map((port, i) => formValue.allowedPorts[i] ? port.key : null)
        .filter(Boolean) as string[];

      const selectedSectors = this.allSectors
        .map((sector, i) => formValue.allowedSectors[i] ? sector.id : null)
        .filter(Boolean) as any[];

      const userData: Omit<User, 'uid' | 'hasChangedDefaultPassword'> = {
        name: formValue.name,
        email: formValue.email,
        civilId: formValue.civilId,
        phone: formValue.phone,
        jobTitle: formValue.jobTitle,
        roles: selectedRoles,
        laboratoryName: formValue.laboratoryName || '',
        permissions: {
          allowedPorts: selectedPorts,
          allowedSectors: selectedSectors,
        },
      };

      if (this.editingUser()) {
        const editing = this.editingUser()!;
        // Remove identifiers from update payload
        const { name, civilId, email, ...updatePayload } = userData;
        await this.userService.updateUser(editing.uid, updatePayload);
        alert(`تم تحديث بيانات المستخدم "${editing.name}" بنجاح.`);
      } else {
        const result = await this.userService.addUser(userData);
        if (result.success) {
           alert(`تمت إضافة المستخدم "${userData.name}" بنجاح. كلمة المرور الافتراضية هي 20252025.`);
        } else {
           alert(`فشلت إضافة المستخدم: ${result.error}`);
        }
      }
      this.cancelEdit();
    }
  }

  deleteUser(user: User): void {
    if (user && confirm(`هل أنت متأكد من رغبتك في حذف المستخدم "${user.name}"؟ سيتم حذف حسابه من Firestore ولكن سيبقى في نظام المصادقة.`)) {
      this.userService.deleteUser(user.uid);
    }
  }

  startEdit(user: User): void {
    this.editingUser.set(user);
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      civilId: user.civilId,
      phone: user.phone,
      jobTitle: user.jobTitle,
      laboratoryName: user.laboratoryName
    });
    
    this.userForm.get('name')?.disable();
    this.userForm.get('email')?.disable();
    this.userForm.get('civilId')?.disable();
    
    this.rolesFormArray.controls.forEach((control, i) => {
      control.setValue(user.roles.includes(this.availableRoles[i].key));
    });

    this.allowedPortsFormArray.controls.forEach((control, i) => {
      control.setValue(user.permissions.allowedPorts.includes(this.allPorts[i].key));
    });

    this.allowedSectorsFormArray.controls.forEach((control, i) => {
      control.setValue(user.permissions.allowedSectors.includes(this.allSectors[i].id));
    });
  }

  cancelEdit(): void {
    this.editingUser.set(null);
    this.userForm.reset();
    this.userForm.get('name')?.enable();
    this.userForm.get('email')?.enable();
    this.userForm.get('civilId')?.enable();
    this.rolesFormArray.controls.forEach(control => control.setValue(false));
    this.allowedPortsFormArray.controls.forEach(control => control.setValue(false));
    this.allowedSectorsFormArray.controls.forEach(control => control.setValue(false));
  }
  
  clearFilters(): void {
    this.selectedPortFilter.set('');
    this.selectedSectorFilter.set('');
  }


  getSectorTitle(id: string): string {
    return this.allSectors.find(s => s.id === id)?.title || id;
  }

  getPortValue(key: string): string {
    return this.allPorts.find(p => p.key === key)?.value || key;
  }

  getRoleTitle(key: string): string {
    return this.availableRoles.find(r => r.key === key)?.title || key;
  }

  getImporterName(id?: string): string {
      if(!id) return '';
      return this.allImporters().find(i => i.id === id)?.name || id;
  }
}