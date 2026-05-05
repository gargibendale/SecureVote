import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Change the icon type on StatCard to use named keys
interface StatCard {
  label: string;
  value: number;
  icon: 'ballot' | 'live' | 'checkmark' | 'calendar';  // named icon keys
  accent: 'blue' | 'green' | 'indigo' | 'amber';
}

// Defines the shape of each election entry in the active list
interface Election {
  title: string;
  status: 'live' | 'soon';
  dateLabel: string;  // e.g. "Ends Apr 12, 2025" or "Starts Apr 20, 2025"
  votes: number;
}

// Change Activity icon type similarly
interface Activity {
  icon: 'ballot' | 'live' | 'ended' | 'alert';
  description: string;
  time: string;
  type: 'created' | 'ended' | 'started' | 'alert';
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  // Update stats array
  stats: StatCard[] = [
    { label: 'Total Elections', value: 12, icon: 'ballot', accent: 'blue' },
    { label: 'Live Now', value: 2, icon: 'live', accent: 'green' },
    { label: 'Total Votes Cast', value: 562, icon: 'checkmark', accent: 'indigo' },
    { label: 'Upcoming', value: 3, icon: 'calendar', accent: 'amber' },
  ];

  // Active & upcoming elections list
  elections: Election[] = [
    { title: 'Student Council Election', status: 'live', dateLabel: 'Ends Apr 10, 2025', votes: 214 },
    { title: 'Faculty Senate Vote', status: 'live', dateLabel: 'Ends Apr 11, 2025', votes: 189 },
    { title: 'Department Head Vote', status: 'soon', dateLabel: 'Starts Apr 18, 2025', votes: 0 },
  ];

  // Update activities array
  activities: Activity[] = [
    { icon: 'ballot', description: 'Election <strong>Student Council Election</strong> created', time: '2 hours ago', type: 'created' },
    { icon: 'live', description: 'Election <strong>Faculty Senate Vote</strong> started', time: '5 hours ago', type: 'started' },
    { icon: 'ended', description: 'Election <strong>Library Committee Vote</strong> ended', time: '1 day ago', type: 'ended' },
    { icon: 'ballot', description: 'Election <strong>Sports Club Election</strong> created', time: '2 days ago', type: 'created' },
    { icon: 'alert', description: 'Suspicious activity flagged in <strong>Department Head Vote</strong>', time: '2 days ago', type: 'alert' },
    { icon: 'ended', description: 'Election <strong>Alumni Board Selection</strong> ended', time: '3 days ago', type: 'ended' },
  ];

}