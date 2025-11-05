import { Injectable, signal, inject } from '@angular/core';
import { db } from '../firebase.config';
import firebase from 'firebase/compat/app';

export interface CommodityGroup {
  name: string;
  commodities: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CommodityService {
  private readonly groupsState = signal<CommodityGroup[]>([]);
  public readonly groups = this.groupsState.asReadonly();

  constructor() {
    db.collection('commodities').onSnapshot((snapshot) => {
      const groups = snapshot.docs.map(doc => ({ name: doc.id, ...doc.data() } as CommodityGroup));
      this.groupsState.set(groups.sort((a, b) => a.name.localeCompare(b.name)));
    });
  }

  async addGroup(groupName: string): Promise<void> {
    if (groupName && !this.groupsState().some(g => g.name === groupName.trim())) {
      const trimmedName = groupName.trim();
      await db.collection('commodities').doc(trimmedName).set({ commodities: [] });
    }
  }

  async deleteGroup(groupName: string): Promise<void> {
    await db.collection('commodities').doc(groupName).delete();
  }

  async addCommodityToGroup(groupName: string, commodityName: string): Promise<void> {
    if (!groupName || !commodityName.trim()) return;
    const groupRef = db.collection('commodities').doc(groupName);
    await groupRef.update({
      commodities: firebase.firestore.FieldValue.arrayUnion(commodityName.trim())
    });
  }

  async deleteCommodity(groupName: string, commodityName: string): Promise<void> {
    const groupRef = db.collection('commodities').doc(groupName);
    await groupRef.update({
      commodities: firebase.firestore.FieldValue.arrayRemove(commodityName)
    });
  }
}
