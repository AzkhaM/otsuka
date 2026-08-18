import { Routes } from '@angular/router';
import { Layout } from './layout/layout';
import { Placeholder } from './pages/placeholder/placeholder';
import { CompanyReports } from './pages/company-reports/company-reports';
import { B3Waste } from './pages/b3-waste/b3-waste';
import { Inspection } from './pages/inspection/inspection';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: Placeholder, data: { title: 'Dashboard' } },
      { path: 'project', component: Placeholder, data: { title: 'Project' } },
      { path: 'task-approval', component: Placeholder, data: { title: 'Task Approval' } },
      { path: 'project-active', component: Placeholder, data: { title: 'Project Active' } },
      { path: 'master/vendor', component: Placeholder, data: { title: 'Master - Vendor' } },
      { path: 'master/pic', component: Placeholder, data: { title: 'Master - PIC' } },
      { path: 'master/job-type', component: Placeholder, data: { title: 'Master - Job Type' } },
      { path: 'guideline', component: Placeholder, data: { title: 'Guideline' } },
      { path: 'audit-log', component: Placeholder, data: { title: 'Audit Log' } },
      { path: 'company-reports', component: CompanyReports, data: { title: 'Laporan HQ Jepang' } },
      { path: 'b3-waste', component: B3Waste, data: { title: 'Limbah B3' } },
      { path: 'inspection', component: Inspection, data: { title: 'Inspeksi & Sertifikasi' } },
    ],
  },
];
