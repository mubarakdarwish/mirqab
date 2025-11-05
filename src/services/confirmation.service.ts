import { Injectable, signal } from '@angular/core';

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  private state = signal<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  public stateReader = this.state.asReadonly();

  request(title: string, message: string, onConfirm: () => void): void {
    this.state.set({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  }

  confirm(): void {
    const currentState = this.state();
    if (currentState.isOpen && currentState.onConfirm) {
      currentState.onConfirm();
    }
    this.close();
  }

  cancel(): void {
    this.close();
  }

  private close(): void {
    this.state.update(s => ({ ...s, isOpen: false }));
  }
}