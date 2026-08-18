export interface MenuChild {
  label: string;
  route: string;
}

export interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: MenuChild[];
  sectionLabel?: string;
}

export const MENU: MenuItem[] = [
  { label: 'Dashboard', icon: 'grid', route: '/dashboard' },
  { label: 'Project', icon: 'folder', route: '/project' },
  { label: 'Task Approval', icon: 'check-square', route: '/task-approval' },
  { label: 'Project Active', icon: 'layers', route: '/project-active' },
  {
    label: 'Master',
    icon: 'settings',
    children: [
      { label: 'Vendor', route: '/master/vendor' },
      { label: 'PIC', route: '/master/pic' },
      { label: 'Job Type', route: '/master/job-type' },
    ],
  },
  { label: 'Guideline', icon: 'book', route: '/guideline' },
  { label: 'Audit Log', icon: 'clipboard', route: '/audit-log' },
  {
    label: 'Laporan HQ Jepang',
    icon: 'file-text',
    route: '/company-reports',
    sectionLabel: 'Fitur Tambahan',
  },
  { label: 'Limbah B3', icon: 'alert-triangle', route: '/b3-waste' },
  { label: 'Inspeksi & Sertifikasi', icon: 'shield', route: '/inspection' },
];
