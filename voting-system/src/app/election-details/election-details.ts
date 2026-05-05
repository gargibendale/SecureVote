import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { Election } from '../election';
import { ElectionService } from '../election-service';

@Component({
  selector: 'app-election-details',
  standalone: true,
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './election-details.html',
  styleUrl: './election-details.scss',
})
export class ElectionDetails implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private electionService = inject(ElectionService);

  // The election object we'll display — starts null until loaded
  election = signal<Election | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  copiedTx = signal(false);

  ngOnInit(): void {
    // First, try to read the election from router navigation state.
    // This is like checking your pocket for a ticket before buying a new one.
    const stateElection = history.state['election'] as Election | undefined;

    if (stateElection) {
      // We got the data for free from the list component
      this.election.set(stateElection);
      this.isLoading.set(false);
    } else {
      // Fallback: user navigated directly to this URL, so fetch by ID
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.electionService.getElectionById(id).subscribe({
        next: (data) => { this.election.set(data); this.isLoading.set(false); },
        error: () => {
          this.error.set('Could not load election details.');
          this.isLoading.set(false);
        }
      });
    }
  }

  // Computes how many days remain (positive) or days ago it ended (negative)
  getDaysRemaining(endDate: string): number {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Returns a short 0x1234…abcd display form of the tx hash
  shortTxHash(hash: string): string {
    return hash ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : '';
  }

  async copyTxHash(hash: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(hash);
      this.copiedTx.set(true);
      setTimeout(() => this.copiedTx.set(false), 2000);
    } catch {
      console.error('Clipboard write failed');
    }
  }

  goBack(): void {
    this.router.navigate(['/elections']);
  }
}