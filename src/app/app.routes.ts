import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MainLayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DesignerComponent } from './designer/designer.component';
import { WorklistComponent } from './worklist/worklist.component';
import { TrackingComponent } from './tracking/tracking.component';
import { WorkflowListComponent } from './workflow-list/workflow-list.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    component: MainLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'workflows', component: WorkflowListComponent },
      { path: 'designer/:id', component: DesignerComponent },
      { path: 'worklist', component: WorklistComponent },
      { path: 'tracking', component: TrackingComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
