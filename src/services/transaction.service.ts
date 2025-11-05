import { Injectable, signal, inject } from '@angular/core';
import type { SectorType } from '../app.component';
import { db } from '../firebase.config';

export interface TransactionCommodity {
  commodityGroup: string;
  commodity: string;
  weight: number;
  packageCount?: number;
  packageType?: string;
  productionDate?: string;
  expiryDate?: string;
  brand?: string;
}

export interface Transaction {
  id?: string; // Firestore Document ID
  importerId: string;
  sectorId: SectorType;
  transactionNumber: string;
  transactionDate: string;
  customsDeclaration: string;
  portOfEntry: string;
  importingCompany: string;
  commodities: TransactionCommodity[];
  countryOfOrigin: string;
  inspectionType: string;
  labAnalysisType?: string;
  inspectionResult: 'compliant' | 'non-compliant';
  nonConformityReason?: string;
  nonConformityDetails?: string;
  finalAction: string;
  pledge: 'yes' | 'no';
  pledgeExpiryDate?: string;
  pledgeFulfillment?: 'yes' | 'no';
  fees: number;
  feesNotes?: string;
  inspector: string;
  notes?: string;
  sampleTaken?: 'yes' | 'no';
  sampleNumber?: string;
  laboratoryName?: string;
  sampleSize?: string;
  sampleDate?: string;
  labResult?: string;
  sampleStatus?: 'pending' | 'complete';
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly transactionsState = signal<Transaction[]>([]);
  public readonly transactions = this.transactionsState.asReadonly();

  constructor() {
    const q = db.collection("transactions").orderBy("transactionDate", "desc");
    q.onSnapshot((snapshot) => {
      this.transactionsState.set(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<void> {
    await db.collection('transactions').add(transaction);
  }
  
  async updateLabResult(transactionId: string, labResult: string): Promise<void> {
    if (!transactionId) return;
    const transactionRef = db.collection('transactions').doc(transactionId);
    await transactionRef.update({
      labResult: labResult,
      sampleStatus: 'complete'
    });
  }

  async findByCustomsDeclaration(declarationNumber: string): Promise<Transaction | null> {
    if (!declarationNumber || !declarationNumber.trim()) {
      return null;
    }
    const querySnapshot = await db.collection('transactions')
      .where('customsDeclaration', '==', declarationNumber.trim())
      .limit(1)
      .get();
      
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Transaction;
  }
}