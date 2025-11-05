import { Component, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { QuarantineDashboardComponent } from './components/quarantine-dashboard/quarantine-dashboard.component';
import { ImportFormComponent } from './components/import-form/import-form.component';
import { CommodityManagementComponent } from './components/commodity-management/commodity-management.component';
import { ImporterManagementComponent } from './components/importer-management/importer-management.component';
import { MainDashboardComponent } from './components/main-dashboard/main-dashboard.component';
import { DropdownManagementComponent } from './components/dropdown-management/dropdown-management.component';
import { DataManagementDashboardComponent } from './components/data-management-dashboard/data-management-dashboard.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { LoginComponent } from './components/login/login.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { RoleSelectionComponent } from './components/role-selection/role-selection.component';
import { UserService, User, Role } from './services/user.service';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationService } from './services/confirmation.service';
import { InitialSetupComponent } from './components/initial-setup/initial-setup.component';
import { LaboratoryPortalComponent } from './components/laboratory-portal/laboratory-portal.component';
import { PublicTrackingComponent } from './components/public-tracking/public-tracking.component';


export type SectorType = 'agricultural' | 'veterinary' | 'food_safety';

export interface Sector {
  id: SectorType;
  title: string;
  description: string;
  icon: string;
}

type ViewState = 'initial_setup' | 'login' | 'app' | 'public_tracking';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    QuarantineDashboardComponent, 
    ImportFormComponent, 
    CommodityManagementComponent, 
    ImporterManagementComponent, 
    MainDashboardComponent, 
    DropdownManagementComponent, 
    DataManagementDashboardComponent, 
    UserManagementComponent,
    LoginComponent,
    ChangePasswordComponent,
    RoleSelectionComponent,
    ConfirmationDialogComponent,
    InitialSetupComponent,
    LaboratoryPortalComponent,
    PublicTrackingComponent
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  
  readonly sectors: Sector[] = [
    {
      id: 'agricultural',
      title: 'الحجر الزراعي',
      description: 'إدارة وتسجيل الواردات والصادرات الزراعية لضمان سلامة النباتات والمنتجات الزراعية.',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-green-500" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21c.5-4.5 2.5-8 7-10" /><path d="M9 18c6.218 0 10.5-3.288 11-12v-2h-4.014c-9 0-11.986 4-12 9c0 1 0 3 2 5h3z" /></svg>`
    },
    {
      id: 'veterinary',
      title: 'الحجر البيطري',
      description: 'مراقبة وتسجيل حركة الحيوانات والمنتجات الحيوانية عبر المنافذ لحماية الثروة الحيوانية.',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-blue-500" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14.25 3.33l-4.5 17.34"></path><path d="M9.75 3.33l4.5 17.34"></path><path d="M10.5 6h3"></path><path d="M10.5 12h3"></path><path d="M10.5 18h3"></path></svg>` 
    },
    {
      id: 'food_safety',
      title: 'سلامة الغذاء',
      description: 'ضمان مطابقة جميع المواد الغذائية المستوردة والمصدرة للمعايير الصحية والجودة المعتمدة.',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`
    }
  ];

  private userService = inject(UserService);
  private confirmationService = inject(ConfirmationService);

  view = signal<ViewState>('login');

  activeSection = signal<SectorType | 'main' | 'data_management'>('main');
  sectorView = signal<'dashboard' | 'import_form'>('dashboard');
  managementView = signal<'dashboard' | 'importers' | 'commodities' | 'dropdowns' | 'users'>('dashboard');
  
  private timerId: any;
  currentTime = signal(new Date());

  currentUser = this.userService.currentUser;
  isInitialSetupNeeded = this.userService.isInitialSetupNeeded;
  showChangePasswordModal = signal(false);
  showRoleSelectionModal = signal(false);
  userMenuOpen = signal(false);
  
  readonly roleMap: { [key in Role]: string } = {
    admin: 'مدير النظام',
    head_of_section: 'رئيس قسم',
    inspector: 'مفتش',
    data_entry: 'مدخل بيانات',
    laboratory: 'مختبر'
  };

  activeRole = this.userService.activeRole;

  // Confirmation Dialog State
  confirmationState = this.confirmationService.stateReader;

  isInternalUser = computed(() => {
      const user = this.currentUser();
      if (!user) return false;
      const internalRoles: Role[] = ['admin', 'head_of_section', 'inspector', 'data_entry'];
      return user.roles.some(role => internalRoles.includes(role));
  });

  visibleSectors = computed(() => {
    const user = this.currentUser();
    if (!user || user.roles.includes('admin')) {
      return this.sectors;
    }
    return this.sectors.filter(sector => user.permissions.allowedSectors.includes(sector.id));
  });

  constructor() {
    if (this.isInitialSetupNeeded()) {
      this.view.set('initial_setup');
    }
  }

  ngOnInit(): void {
    this.timerId = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  onLoginSuccess(user: User): void {
    this.view.set('app');
    if (user.roles.length > 1) {
      this.showRoleSelectionModal.set(true);
    } else {
      this.userService.setActiveRole(user.roles.length > 0 ? user.roles[0] : null);
      this.proceedAfterRoleSelection();
    }
  }

  onRoleSelected(role: Role): void {
    this.userService.setActiveRole(role);
    this.showRoleSelectionModal.set(false);
    this.proceedAfterRoleSelection();
  }

  private proceedAfterRoleSelection(): void {
    const user = this.currentUser();
    if (user && !user.hasChangedDefaultPassword) {
      this.showChangePasswordModal.set(true);
    }
  }

  onPasswordChanged(): void {
    this.showChangePasswordModal.set(false);
  }

  onLogout(): void {
    this.userService.logout();
    this.userMenuOpen.set(false);
    this.showMainDashboard();
    this.view.set('login');
  }

  gregorianDate = computed(() => {
    return new Intl.DateTimeFormat('ar-OM', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(this.currentTime());
  });

  hijriDate = computed(() => {
    return new Intl.DateTimeFormat('ar-OM-u-ca-islamic-umalqura', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(this.currentTime());
  });

  formattedTime = computed(() => {
    return this.currentTime().toLocaleTimeString('ar-OM', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });

  selectedSector = computed(() => {
    const active = this.activeSection();
    if (active === 'main' || active === 'data_management') {
      return undefined;
    }
    return this.sectors.find(s => s.id === active);
  });

 pageTitle = computed(() => {
    const active = this.activeSection();
    if (active === 'main') {
        return 'لوحة التحكم الرئيسية';
    }
    
    if (active === 'data_management') {
        switch (this.managementView()) {
            case 'dashboard': return 'إدارة البيانات';
            case 'importers': return 'إدارة الشركات المستوردة';
            case 'commodities': return 'إدارة المجموعات والسلع';
            case 'dropdowns': return 'إدارة بيانات النماذج';
            case 'users': return 'إدارة المستخدمين والصلاحيات';
            default: return 'إدارة البيانات';
        }
    }

    // If it's a sector
    switch (this.sectorView()) {
      case 'dashboard':
        return this.selectedSector()?.title ?? 'لوحة التحكم';
      case 'import_form':
        return `تسجيل وارد جديد`;
      default:
        return 'منصة منافذ الحجر وسلامة الغذاء';
    }
  });

  selectSector(sectorId: SectorType): void {
    this.activeSection.set(sectorId);
    this.sectorView.set('dashboard');
  }
  
  showMainDashboard(): void {
    this.activeSection.set('main');
    this.sectorView.set('dashboard');
  }

  showDataManagement(): void {
    this.activeSection.set('data_management');
    this.managementView.set('dashboard');
  }

  showImportForm(): void {
    this.sectorView.set('import_form');
  }

  showSectorDashboard(): void {
    this.sectorView.set('dashboard');
  }

  showDataManagementDashboard(): void {
    this.managementView.set('dashboard');
  }

  showCommodityManagement(): void {
    this.managementView.set('commodities');
  }

  showImporterManagement(): void {
    this.managementView.set('importers');
  }

  showDropdownManagement(): void {
    this.managementView.set('dropdowns');
  }
  
  showUserManagement(): void {
    this.managementView.set('users');
  }
  
  showPublicTracking(): void {
    this.onLogout();
    this.view.set('public_tracking');
  }
  
  returnToLogin(): void {
    this.view.set('login');
  }

  // Confirmation Dialog Actions
  onConfirm(): void {
    this.confirmationService.confirm();
  }

  onCancel(): void {
    this.confirmationService.cancel();
  }
}