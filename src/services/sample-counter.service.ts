import { Injectable } from '@angular/core';
import type { SectorType } from '../app.component';
import { db } from '../firebase.config';

const PORT_ABBR: { [key: string]: string } = {
  'sohar_port': 'SOH',
  'salalah_port': 'SAL',
  'muscat_airport': 'MCT',
  'al_wajajah_border': 'WAJ'
};

const SECTOR_ABBR: { [key: string]: string } = {
  'agricultural': 'AGRI',
  'veterinary': 'VET',
  'food_safety': 'FOOD'
};

@Injectable({
  providedIn: 'root'
})
export class SampleCounterService {

  async generateSampleNumber(port: string, sector: SectorType): Promise<string> {
    const counterId = `${port}_${sector}`;
    const counterRef = db.collection("counters").doc("samples");

    let nextCount = 1;

    try {
      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        if (!counterDoc.exists) {
          transaction.set(counterRef, { [counterId]: nextCount });
        } else {
          const data = counterDoc.data();
          const currentCount = data ? data[counterId] || 0 : 0;
          nextCount = currentCount + 1;
          transaction.update(counterRef, { [counterId]: nextCount });
        }
      });

      const portAbbr = PORT_ABBR[port] || 'XXX';
      const sectorAbbr = SECTOR_ABBR[sector] || 'XXX';
      const paddedCount = String(nextCount).padStart(5, '0');

      return `${portAbbr}-${sectorAbbr}-SAMPLE-${paddedCount}`;

    } catch (e) {
      console.error("Sample counter failed: ", e);
      return `ERR-SAMPLE-${Date.now()}`;
    }
  }
}
