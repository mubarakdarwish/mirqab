import { Component, ChangeDetectionStrategy, output } from '@angular/core';

@Component({
  selector: 'app-data-management-dashboard',
  standalone: true,
  templateUrl: './data-management-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataManagementDashboardComponent {
  navigateToImporters = output<void>();
  navigateToCommodities = output<void>();
  navigateToDropdowns = output<void>();
  navigateToUsers = output<void>();
  navigateToPublicTracking = output<void>();

  onNavigateToImporters(): void {
    this.navigateToImporters.emit();
  }

  onNavigateToCommodities(): void {
    this.navigateToCommodities.emit();
  }

  onNavigateToDropdowns(): void {
    this.navigateToDropdowns.emit();
  }

  onNavigateToUsers(): void {
    this.navigateToUsers.emit();
  }

  onNavigateToPublicTracking(): void {
    this.navigateToPublicTracking.emit();
  }
}