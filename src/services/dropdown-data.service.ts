import { Injectable, signal, inject } from '@angular/core';
import { db } from '../firebase.config';
import firebase from 'firebase/compat/app';
import type { SectorType } from '../app.component';

export interface DropdownOption {
  key: string;
  value: string;
}

export type SectorSpecificData = { [key in SectorType]: string[] };

export interface DropdownData {
  ports: DropdownOption[];
  countries: string[];
  inspectionTypes: string[];
  finalActions: DropdownOption[];
  packageTypes: string[];
  labAnalysisTypes: SectorSpecificData;
  nonConformityReasons: SectorSpecificData;
  laboratories: string[];
  labResults: string[];
}

export type DropdownCategory = keyof DropdownData;
export type SectorDropdownCategory = 'labAnalysisTypes' | 'nonConformityReasons';

const INITIAL_DATA: DropdownData = {
  ports: [
    { key: 'sohar_port', value: 'ميناء صحار' },
    { key: 'salalah_port', value: 'ميناء صلالة' },
    { key: 'muscat_airport', value: 'مطار مسقط الدولي' },
    { key: 'al_wajajah_border', value: 'منفذ الوجاجة البري' }
  ],
  countries: [
    'الإمارات العربية المتحدة',
    'المملكة العربية السعودية',
    'الهند',
    'إيران',
    'مصر'
  ],
  inspectionTypes: [ 'فحص ظاهري', 'فحص مخبري', 'فحص مستندي' ],
  finalActions: [
    { key: 'release', value: 'إفراج' }, { key: 'reject', value: 'رفض' },
    { key: 'destroy', value: 'إتلاف' }, { key: 're-export', value: 'إعادة تصدير' }
  ],
  packageTypes: [ 'كرتون', 'صندوق', 'كيس', 'حاوية' ],
  labAnalysisTypes: {
    agricultural: ['تحليل بقايا مبيدات', 'فحص آفات'],
    veterinary: ['تحليل هرمونات', 'فحص أمراض حيوانية'],
    food_safety: ['تحليل ميكروبيولوجي', 'تحليل كيميائي']
  },
  nonConformityReasons: {
    agricultural: ['إصابة حشرية', 'مخالفة لقانون الحجر الزراعي'],
    veterinary: ['إصابة بمرض معدي', 'عدم وجود شهادة منشأ'],
    food_safety: ['تلوث بكتيري', 'انتهاء الصلاحية', 'عدم مطابقة المواصفات']
  },
  laboratories: [
    'المختبر المركزي للرقابة على الأغذية',
    'مختبر ضبط جودة الأسماك',
    'مختبر بحوث أمراض الحيوان'
  ],
  labResults: [ 'مطابق للمواصفات', 'غير مطابق للمواصفات', 'قيد الفحص' ]
};

@Injectable({
  providedIn: 'root'
})
export class DropdownDataService {
  private readonly docRef = db.collection('settings').doc('dropdowns');
  private readonly dataState = signal<DropdownData>(INITIAL_DATA);
  public readonly data = this.dataState.asReadonly();

  constructor() {
    this.docRef.onSnapshot((docSnap) => {
      if (docSnap.exists) {
        this.dataState.set(docSnap.data() as DropdownData);
      } else {
        // If the document doesn't exist, create it with initial data
        this.docRef.set(INITIAL_DATA);
        this.dataState.set(INITIAL_DATA);
      }
    });
  }

  async addItem(category: DropdownCategory, value: string, context?: string): Promise<void> {
    if (!value.trim()) return;

    if (category === 'labAnalysisTypes' || category === 'nonConformityReasons') {
      const sectorId = context as SectorType;
      const fieldPath = `${category}.${sectorId}`;
      await this.docRef.update({ [fieldPath]: firebase.firestore.FieldValue.arrayUnion(value.trim()) });
    } else if (category === 'ports' || category === 'finalActions') {
      const optionKey = context?.trim() || value.trim().toLowerCase().replace(/\s+/g, '_');
      const newOption: DropdownOption = { key: optionKey, value: value.trim() };
      await this.docRef.update({ [category]: firebase.firestore.FieldValue.arrayUnion(newOption) });
    } else {
      await this.docRef.update({ [category]: firebase.firestore.FieldValue.arrayUnion(value.trim()) });
    }
  }

  async deleteItem(category: DropdownCategory, itemIdentifier: string, context?: string): Promise<void> {
    if (category === 'labAnalysisTypes' || category === 'nonConformityReasons') {
      const sectorId = context as SectorType;
      const fieldPath = `${category}.${sectorId}`;
      await this.docRef.update({ [fieldPath]: firebase.firestore.FieldValue.arrayRemove(itemIdentifier) });
    } else if (category === 'ports' || category === 'finalActions') {
      const currentList = (this.data()[category] as DropdownOption[]).filter(item => item.key !== itemIdentifier);
      await this.docRef.update({ [category]: currentList });
    } else {
       await this.docRef.update({ [category]: firebase.firestore.FieldValue.arrayRemove(itemIdentifier) });
    }
  }

  async selectAllCountries(allCountries: string[]): Promise<void> {
    const sortedCountries = [...allCountries].sort((a, b) => a.localeCompare(b));
    await this.docRef.update({ countries: sortedCountries });
  }

  async clearCountries(): Promise<void> {
    await this.docRef.update({ countries: [] });
  }
}
