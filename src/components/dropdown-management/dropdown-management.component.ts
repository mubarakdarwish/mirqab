import { Component, ChangeDetectionStrategy, output, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DropdownDataService, DropdownCategory, SectorDropdownCategory } from '../../services/dropdown-data.service';
import { allCountries } from '../../data/countries';
import type { SectorType } from '../../app.component';

@Component({
  selector: 'app-dropdown-management',
  templateUrl: './dropdown-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class DropdownManagementComponent {
  closeView = output<void>();
  
  // FIX: Removed FormBuilder injection as it was causing type errors. Forms are now created directly.
  dropdownService = inject(DropdownDataService);
  
  dropdownData = this.dropdownService.data;
  
  formGroups: { [key: string]: FormGroup } = {};

  managementSections: { key: DropdownCategory, title: string, placeholder: string, hasKey: boolean, isSectorSpecific: boolean }[] = [
    { key: 'ports', title: 'المنافذ', placeholder: 'اسم المنفذ', hasKey: true, isSectorSpecific: false },
    { key: 'countries', title: 'بلدان المنشأ', placeholder: 'اسم البلد', hasKey: false, isSectorSpecific: false },
    { key: 'inspectionTypes', title: 'أنواع الفحص', placeholder: 'نوع الفحص', hasKey: false, isSectorSpecific: false },
    { key: 'finalActions', title: 'الإجراءات النهائية', placeholder: 'اسم الإجراء', hasKey: true, isSectorSpecific: false },
    { key: 'packageTypes', title: 'أنواع التعبئة', placeholder: 'نوع التعبئة', hasKey: false, isSectorSpecific: false },
    { key: 'labAnalysisTypes', title: 'أنواع التحليل المخبري', placeholder: 'نوع التحليل', hasKey: false, isSectorSpecific: true },
    { key: 'nonConformityReasons', title: 'أسباب عدم المطابقة', placeholder: 'سبب عدم المطابقة', hasKey: false, isSectorSpecific: true },
    { key: 'laboratories', title: 'المختبرات', placeholder: 'اسم المختبر', hasKey: false, isSectorSpecific: false },
    { key: 'labResults', title: 'نتائج الفحص المخبري', placeholder: 'نتيجة الفحص', hasKey: false, isSectorSpecific: false },
  ];

  readonly sectorsForTabs: { id: SectorType, title: string }[] = [
    { id: 'agricultural', title: 'الحجر الزراعي' },
    { id: 'veterinary', title: 'الحجر البيطري' },
    { id: 'food_safety', title: 'سلامة الغذاء' }
  ];

  activeSectorTabs = signal<{ [key: string]: SectorType }>({
    labAnalysisTypes: 'agricultural',
    nonConformityReasons: 'agricultural'
  });

  readonly allCountries = allCountries;
  countrySearchTerm = signal('');

  filteredCountries = computed(() => {
    const term = this.countrySearchTerm().toLowerCase().trim();
    if (!term) {
      return this.allCountries;
    }
    return this.allCountries.filter(country => country.toLowerCase().includes(term));
  });

  constructor() {
    this.managementSections.forEach(section => {
      // FIX: Replaced `this.fb.group` with `new FormGroup` and `new FormControl`.
      const formConfig: { [key: string]: FormControl } = { value: new FormControl('', Validators.required) };
      if (section.hasKey) {
        formConfig['key'] = new FormControl('', Validators.required);
      }
      this.formGroups[section.key] = new FormGroup(formConfig);
    });
  }

  onClose(): void {
    this.closeView.emit();
  }

  addItem(category: DropdownCategory): void {
    const form = this.formGroups[category];
    if (form.valid) {
      const { value, key } = form.value;
      const context = (category === 'labAnalysisTypes' || category === 'nonConformityReasons') 
        ? this.activeSectorTabs()[category] 
        : key;
      this.dropdownService.addItem(category, value, context);
      form.reset();
    }
  }

  deleteItem(category: DropdownCategory, itemIdentifier: string): void {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا العنصر؟')) {
       const context = (category === 'labAnalysisTypes' || category === 'nonConformityReasons') 
        ? this.activeSectorTabs()[category] 
        : undefined;
      this.dropdownService.deleteItem(category, itemIdentifier, context);
    }
  }

  isCountrySelected(country: string): boolean {
    return this.dropdownData().countries.includes(country);
  }

  onCountryToggle(country: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.dropdownService.addItem('countries', country);
    } else {
      this.dropdownService.deleteItem('countries', country);
    }
  }

  selectAllCountries(): void {
    this.dropdownService.selectAllCountries(this.allCountries);
  }

  deselectAllCountries(): void {
    if (confirm('هل أنت متأكد من رغبتك في إلغاء تحديد جميع البلدان؟ هذا الإجراء سيفرغ القائمة.')) {
      this.dropdownService.clearCountries();
    }
  }

  selectTab(category: SectorDropdownCategory, sector: SectorType): void {
    this.activeSectorTabs.update(tabs => ({
        ...tabs,
        [category]: sector
    }));
  }

  getSectorTabTitle(sectionKey: string): string {
    const activeTabId = this.activeSectorTabs()[sectionKey];
    return this.sectorsForTabs.find(s => s.id === activeTabId)?.title || '';
  }
}