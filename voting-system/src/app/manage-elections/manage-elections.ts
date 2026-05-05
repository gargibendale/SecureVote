import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ElectionService } from '../election-service';
import { Election } from '../election';
import { Router } from '@angular/router';

@Component({
  selector: 'app-manage-elections',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './manage-elections.html',
  styleUrl: './manage-elections.scss',
})
export class ManageElections implements OnInit {
  private electionService = inject(ElectionService);
  private router = inject(Router);

  elections = signal<Election[]>([]);
  expandedId = signal<number | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  confirmEndId = signal<number | null>(null);  // holds the election_id awaiting confirmation
  endLoading = signal(false);
  endError = signal<string | null>(null);

  ngOnInit(): void {
    this.electionService.getElections().subscribe({
      next: (data) => {
        this.elections.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load elections. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // Toggles a card open/closed. If clicking the already-open card, close it.
  toggleExpand(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  onViewResults(event: MouseEvent, election: Election): void {
    event.stopPropagation();
    this.router.navigate(['/results', election.election_id], { queryParams: { electionId: election.election_id } });
  }

  onEndElection(event: MouseEvent, election: Election): void {
    event.stopPropagation();
    this.endError.set(null);
    this.confirmEndId.set(election.election_id);
  }

  confirmEnd(): void {
    const id = this.confirmEndId();
    if (id === null) return;

    this.endLoading.set(true);
    this.electionService.endElection(id).subscribe({
      next: () => {
        // Update the election's status in the signal array locally
        this.elections.update(list =>
          list.map(e => e.election_id === id ? { ...e, status: 'ended' as const } : e)
        );
        this.endLoading.set(false);
        this.confirmEndId.set(null);
      },
      error: () => {
        this.endError.set('Failed to end election. Please try again.');
        this.endLoading.set(false);
      }
    });
  }

  cancelEnd(): void {
    this.confirmEndId.set(null);
    this.endError.set(null);
  }
}
