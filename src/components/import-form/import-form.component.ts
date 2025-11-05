import { Component, ChangeDetectionStrategy, inject, input, output, OnInit, signal, computed, effect } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators, FormArray } from '@angular/forms';
import type { Sector } from '../../app.component';
import { CommodityService } from '../../services/commodity.service';
import { TransactionCounterService } from '../../services/transaction-counter.service';
import { ImporterService } from '../../services/importer.service';
import { Transaction, TransactionService } from '../../services/transaction.service';
import { DropdownDataService } from '../../services/dropdown-data.service';
import { UserService } from '../../services/user.service';
import { SampleCounterService } from '../../services/sample-counter.service';

@Component({
  selector: 'app-import-form',
  templateUrl: './import-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class ImportFormComponent implements OnInit {
  // FIX: Removed FormBuilder injection as it was causing type errors. Forms are now created directly.
  commodityService = inject(CommodityService);
  transactionCounterService = inject(TransactionCounterService);
  sampleCounterService = inject(SampleCounterService);
  importerService = inject(ImporterService);
  transactionService = inject(TransactionService);
  dropdownDataService = inject(DropdownDataService);
  userService = inject(UserService);

  sectorData = input.required<Sector>();
  formClose = output<void>();

  importForm!: FormGroup;
  commodityEntryForm!: FormGroup;
  toastMessage = signal<string | null>(null);

  commodityGroups = this.commodityService.groups;
  availableCommodities = signal<string[]>([]);
  dropdownOptions = this.dropdownDataService.data;
  foundImporterName = signal<string | null>(null);

  currentUser = this.userService.currentUser;
  inspectors = this.userService.inspectors;
  
  availablePorts = computed(() => {
    const user = this.currentUser();
    const allPorts = this.dropdownOptions().ports;
    if (!user || user.roles.includes('admin')) {
      return allPorts;
    }
    return allPorts.filter(port => user.permissions.allowedPorts.includes(port.key));
  });

  canSelectInspector = computed(() => {
    const activeRole = this.userService.activeRole();
    if (!activeRole) return false;
    return ['admin', 'head_of_section', 'data_entry'].includes(activeRole);
  });
  
  sectorLabAnalysisTypes = computed(() => {
    const sectorId = this.sectorData().id;
    return this.dropdownOptions().labAnalysisTypes[sectorId] || [];
  });

  sectorNonConformityReasons = computed(() => {
    const sectorId = this.sectorData().id;
    return this.dropdownOptions().nonConformityReasons[sectorId] || [];
  });

  commodityTableColspan = computed(() => {
    const sectorId = this.sectorData().id;
    let colspan = 5; // Base: Group, Commodity, Pkg, Weight, Action
    if (sectorId === 'veterinary') {
      colspan += 3; // Prod, Exp, Brand
    } else if (sectorId === 'food_safety') {
      colspan += 2; // Prod, Exp
    }
    return colspan;
  });

  get commodities(): FormArray {
    return this.importForm.get('commodities') as FormArray;
  }

  private importerExistsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) {
        return null; // Handled by 'required' validator
      }
      const exists = this.importerService.importers().some(importer => importer.crNumber === value);
      return exists ? null : { importerNotFound: true };
    };
  }

  constructor() {
    effect(() => {
      const user = this.currentUser();
      const activeRole = this.userService.activeRole();
      if (!user || !this.importForm || activeRole === null) return;

      const inspectorControl = this.importForm.get('inspector');
      if (this.canSelectInspector()) {
          inspectorControl?.enable();
          if (this.inspectors().every(i => i.name !== inspectorControl?.value)) {
            inspectorControl?.reset('');
          }
      } else { // This user has an active role, and it's 'inspector'
          inspectorControl?.setValue(user.name);
          inspectorControl?.disable();
      }
    });
  }

  ngOnInit(): void {
    // FIX: Replaced `this.fb.group` with `new FormGroup` and `this.fb.array` with `new FormArray`.
    this.importForm = new FormGroup({
      transactionNumber: new FormControl({ value: 'سيتم إنشاؤه عند الحفظ', disabled: true }),
      transactionDate: new FormControl(new Date().toISOString().split('T')[0], Validators.required),
      customsDeclaration: new FormControl('', Validators.required),
      portOfEntry: new FormControl('', Validators.required),
      importingCompanyCrNumber: new FormControl('', [Validators.required, this.importerExistsValidator()]),
      commodities: new FormArray([], [Validators.required, Validators.minLength(1)]),
      countryOfOrigin: new FormControl('', Validators.required),
      inspectionType: new FormControl('', Validators.required),
      labAnalysisType: new FormControl(''),
      inspectionResult: new FormControl('', Validators.required),
      nonConformityReason: new FormControl(''),
      nonConformityDetails: new FormControl(''),
      finalAction: new FormControl('', Validators.required),
      pledge: new FormControl('no', Validators.required),
      pledgeExpiryDate: new FormControl(''),
      pledgeFulfillment: new FormControl(''),
      sampleTaken: new FormControl('no', Validators.required),
      sampleNumber: new FormControl({ value: 'سيتم إنشاؤه عند الحفظ', disabled: true }),
      laboratoryName: new FormControl(''),
      sampleSize: new FormControl(''),
      sampleDate: new FormControl(''),
      labResult: new FormControl(''),
      fees: new FormControl('', [Validators.required, Validators.min(0)]),
      feesNotes: new FormControl(''),
      inspector: new FormControl('', Validators.required),
      notes: new FormControl(''),
    });

    const commodityFormConfig: { [key: string]: any } = {
      commodityGroup: new FormControl('', Validators.required),
      commodity: new FormControl({ value: '', disabled: true }, Validators.required),
      weight: new FormControl('', [Validators.required, Validators.min(0.1)]),
      packageCount: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern('^[1-9][0-9]*$')]),
      packageType: new FormControl('', Validators.required),
    };

    const sectorId = this.sectorData().id;

    if (sectorId === 'food_safety' || sectorId === 'veterinary') {
        commodityFormConfig['productionDate'] = new FormControl('', Validators.required);
        commodityFormConfig['expiryDate'] = new FormControl('', Validators.required);
    }
    
    if (sectorId === 'veterinary') {
        commodityFormConfig['brand'] = new FormControl('', Validators.required);
    }

    // FIX: Replaced `this.fb.group` with `new FormGroup`.
    this.commodityEntryForm = new FormGroup(commodityFormConfig);


    this.commodityEntryForm.get('commodityGroup')?.valueChanges.subscribe(groupName => {
      const commodityControl = this.commodityEntryForm.get('commodity');
      if (groupName) {
        const selectedGroup = this.commodityGroups().find(g => g.name === groupName);
        this.availableCommodities.set(selectedGroup?.commodities || []);
        commodityControl?.enable();
      } else {
        this.availableCommodities.set([]);
        commodityControl?.disable();
      }
      commodityControl?.reset('');
    });

    this.importForm.get('importingCompanyCrNumber')?.valueChanges.subscribe(crNumber => {
      const control = this.importForm.get('importingCompanyCrNumber');
      if (control?.valid && crNumber) {
        const importer = this.importerService.importers().find(i => i.crNumber === crNumber);
        this.foundImporterName.set(importer ? importer.name : null);
      } else {
        this.foundImporterName.set(null);
      }
    });

    this.importForm.get('inspectionResult')?.valueChanges.subscribe(value => {
        const reasonControl = this.importForm.get('nonConformityReason');
        const detailsControl = this.importForm.get('nonConformityDetails');
        if (value === 'non-compliant') {
            reasonControl?.setValidators([Validators.required]);
            detailsControl?.setValidators([Validators.required]);
        } else {
            reasonControl?.clearValidators();
            detailsControl?.clearValidators();
        }
        reasonControl?.updateValueAndValidity();
        detailsControl?.updateValueAndValidity();
    });

    this.importForm.get('pledge')?.valueChanges.subscribe(value => {
        const expiryDateControl = this.importForm.get('pledgeExpiryDate');
        const fulfillmentControl = this.importForm.get('pledgeFulfillment');
        if (value === 'yes') {
            expiryDateControl?.setValidators([Validators.required]);
            fulfillmentControl?.setValidators([Validators.required]);
        } else {
            expiryDateControl?.clearValidators();
            fulfillmentControl?.clearValidators();
        }
        expiryDateControl?.updateValueAndValidity();
        fulfillmentControl?.updateValueAndValidity();
    });

    this.importForm.get('sampleTaken')?.valueChanges.subscribe(value => {
        const labName = this.importForm.get('laboratoryName');
        const sampleSize = this.importForm.get('sampleSize');
        const sampleDate = this.importForm.get('sampleDate');
        const labResult = this.importForm.get('labResult');
        const controls = [labName, sampleSize, sampleDate, labResult];

        if (value === 'yes') {
            controls.forEach(control => control?.setValidators([Validators.required]));
        } else {
            controls.forEach(control => {
                control?.clearValidators();
                control?.reset('');
            });
        }
        controls.forEach(control => control?.updateValueAndValidity());
    });
  }

  addCommodity(): void {
    if (this.commodityEntryForm.valid) {
      // FIX: Replaced `this.fb.group` with `new FormGroup`.
      const formControls: { [key: string]: FormControl } = {};
      const rawValue = this.commodityEntryForm.getRawValue();
      for (const key in rawValue) {
        if (Object.prototype.hasOwnProperty.call(rawValue, key)) {
          formControls[key] = new FormControl(rawValue[key]);
        }
      }
      this.commodities.push(new FormGroup(formControls));
      this.commodityEntryForm.reset({ commodity: { value: '', disabled: true } });
      this.availableCommodities.set([]);
      this.commodities.markAsTouched();
    }
  }

  removeCommodity(index: number): void {
    this.commodities.removeAt(index);
    this.commodities.markAsTouched();
  }

  onCancel(): void {
    this.formClose.emit();
  }

  async onSubmit(): Promise<void> {
    this.importForm.markAllAsTouched();
    if (this.importForm.valid) {
      const portKey = this.importForm.value.portOfEntry;
      const sectorId = this.sectorData().id;
      
      const formValue = this.importForm.getRawValue();

      if (formValue.sampleTaken === 'yes') {
          formValue.sampleNumber = await this.sampleCounterService.generateSampleNumber(portKey, sectorId);
          formValue.sampleStatus = 'pending';
      }

      const newTransactionNumber = await this.transactionCounterService.generateTransactionNumber(portKey, sectorId);

      const crNumber = formValue.importingCompanyCrNumber;
      const importer = this.importerService.importers().find(i => i.crNumber === crNumber);

      if (!importer || !importer.id) {
          this.toastMessage.set('خطأ: لم يتم العثور على الشركة المستوردة.');
          setTimeout(() => this.toastMessage.set(null), 5000);
          return;
      }
      
      const port = this.dropdownOptions().ports.find(p => p.key === portKey)?.value || portKey;
      const { importingCompanyCrNumber, ...restOfForm } = formValue;

      const submissionData: Transaction = { 
        sectorId: sectorId,
        ...restOfForm,
        portOfEntry: port,
        importingCompany: importer.name,
        importerId: importer.id,
        transactionNumber: newTransactionNumber,
      };

      this.transactionService.addTransaction(submissionData);

      this.toastMessage.set(`تم حفظ المعاملة بنجاح! رقم المعاملة: ${newTransactionNumber}`);
      
      setTimeout(() => this.toastMessage.set(null), 5000);

      setTimeout(() => this.formClose.emit(), 1500);

    } else {
      console.error('Form is invalid');
      this.toastMessage.set('الرجاء تعبئة جميع الحقول الإلزامية والتأكد من صحة البيانات.');
      setTimeout(() => this.toastMessage.set(null), 5000);
    }
  }
}