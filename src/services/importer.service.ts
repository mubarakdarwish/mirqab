import { Injectable, signal, inject } from '@angular/core';
import { db } from '../firebase.config';

export interface Importer {
  id?: string; // Firestore document ID
  crNumber: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  activityType: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImporterService {
  private readonly importersState = signal<Importer[]>([]);
  public readonly importers = this.importersState.asReadonly();

  constructor() {
     db.collection('importers').onSnapshot((snapshot) => {
      const importers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Importer));
      this.importersState.set(importers.sort((a, b) => a.name.localeCompare(b.name)));
    });
  }

  async addImporter(importer: Omit<Importer, 'id'>): Promise<void> {
    if (importer && importer.crNumber.trim() && importer.name.trim()) {
      if (this.importersState().some(i => i.crNumber === importer.crNumber.trim())) {
        alert('رقم السجل التجاري موجود بالفعل.');
        return;
      }
      await db.collection('importers').add(importer);
    }
  }

  async deleteImporter(importerId: string): Promise<void> {
    if (importerId) {
      await db.collection('importers').doc(importerId).delete();
    }
  }
}
