import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, SlicePipe } from '@angular/common';
import { ElectionService } from '../election-service';
import { Election } from '../election';

@Component({
  selector: 'app-elections',
  standalone: true,
  imports: [DatePipe, SlicePipe],
  templateUrl: './elections.html',
  styleUrl: './elections.scss',
})
export class Elections implements OnInit {
  private electionService = inject(ElectionService);
  private router = inject(Router);

  elections = signal<Election[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Tracks which tx hash was just copied, so we can show a ✓ confirmation
  // per card (keyed by election_id). Like a temporary "toast" per button.
  copiedTxId = signal<number | null>(null);

  activeElections = computed(() =>
    this.elections().filter(e => e.status === 'active')
  );

  endedElections = computed(() =>
    this.elections().filter(e => e.status === 'ended')
  );

  ngOnInit(): void {
    this.loadElections();
  }

  loadElections(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.electionService.getElections().subscribe({
      next: (data) => { this.elections.set(data); this.isLoading.set(false); },
      error: (err) => {
        this.error.set('Failed to load elections. Please try again.');
        this.isLoading.set(false);
        console.error(err);
      }
    });
  }

  // Navigates to the voting/detail flow for any election (active or ended)
  // In elections.ts — update onSelectElection
  onSelectElection(election: Election): void {
    this.router.navigate(['/election-details', election.election_id], {
      state: { election }   // passes the full object via router state
    });
  }

  castVote(election: Election): void {
    this.router.navigate(['/vote', election.election_id], {
      state: { election }
    });
  }

  // Navigates to the results page for any election
  onViewResults(election: Election): void {
    // stopPropagation prevents the card's (click) from also firing,
    // which would navigate to the voting component instead — like stopping
    // a click on a button inside an <a> tag from following the link.
    this.router.navigate(['/results', election.election_id], { queryParams: { electionId: election.election_id } });
  }

  // Copies tx_hash to clipboard and shows a brief ✓ confirmation on that card
  async copyTxHash(event: MouseEvent, election: Election): Promise<void> {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(election.tx_hash);
      this.copiedTxId.set(election.election_id);
      // Reset back to copy icon after 2 seconds
      setTimeout(() => this.copiedTxId.set(null), 2000);
    } catch (err) {
      console.error('Failed to copy tx hash:', err);
    }
  }
}