import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './dashboard-layout/dashboard-layout.component';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'residents',
        loadComponent: () => import('../residents/residents.component').then(m => m.ResidentsComponent),
      },
      {
        path: 'maintenance',
        loadComponent: () => import('../maintenance/maintenance.component').then(m => m.MaintenanceComponent),
      },
      {
        path: 'complaints',
        loadComponent: () => import('../complaints/complaints.component').then(m => m.ComplaintsComponent),
      },
      {
        path: 'visitors',
        loadComponent: () => import('../visitors/visitors.component').then(m => m.VisitorsComponent),
      },
      {
        path: 'inventory',
        loadComponent: () => import('../inventory/inventory.component').then(m => m.InventoryComponent),
      },
      {
        path: 'parking',
        loadComponent: () => import('../parking/parking.component').then(m => m.ParkingComponent),
      },
      {
        path: 'subscription',
        loadComponent: () => import('../subscription/subscription.component').then(m => m.SubscriptionComponent),
      },
      {
        path: 'admin',
        loadComponent: () => import('../admin/admin.component').then(m => m.AdminComponent),
        data: { roles: ['SUPER_ADMIN', 'PLATFORM_OWNER'] },
      },
    ],
  },
];
