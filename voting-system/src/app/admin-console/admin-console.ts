import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dashboard } from '../dashboard/dashboard';
import { CreateElection } from '../create-election/create-election';
import { ManageElections } from '../manage-elections/manage-elections';
import { Results } from '../results/results';

// Defines the shape of each nav item
interface NavItem {
  id: string;
  label: string;
  icon: string; // Unicode symbol used as a lightweight icon
}

@Component({
  selector: 'app-admin-console',
  standalone: true,
  imports: [CommonModule, Dashboard, CreateElection, ManageElections, Results],
  templateUrl: './admin-console.html',
  styleUrl: './admin-console.scss',
})
export class AdminConsole {
  // signal() is Angular 17's reactive primitive — like a variable that the
  // template automatically re-renders when its value changes
  activeView = signal<string>('dashboard');

  // Sidebar nav items — each maps to a view ID and a display label
  navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'create-election', label: 'Create Election', icon: '＋' },
    { id: 'manage-elections', label: 'Manage Elections', icon: '≡' },
    { id: 'results', label: 'Results', icon: '◎' },
  ];

  // Called when the user clicks a nav item — updates the active view signal
  setView(id: string): void {
    this.activeView.set(id);
  }
}
