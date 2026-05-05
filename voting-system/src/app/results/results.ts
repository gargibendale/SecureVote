import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { ElectionService } from '../election-service';
import { Election, CandidateResult, ResultsResponse } from '../election';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results implements OnInit {
  // --- State ---
  elections: Election[] = [];           // All elections for the dropdown
  selectedElectionId: number | null = null; // Currently chosen election ID
  selectedElection: Election | null = null; // Full election object for the info card

  candidateResults: CandidateResult[] = []; // Enriched per-candidate results
  totalVotes: number = 0;
  winner: CandidateResult | null = null;

  isLoadingElections = false;
  isLoadingResults = false;
  errorMessage: string | null = null;

  constructor(private electionService: ElectionService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.loadElections();
  }

  // Fetch all elections to populate the dropdown
  loadElections(): void {
    this.isLoadingElections = true;
    this.electionService.getElections().subscribe({
      next: (elections) => {
        this.elections = elections;
        this.isLoadingElections = false;

        // Read query param AFTER elections are loaded so the dropdown has data
        const idParam = this.route.snapshot.queryParamMap.get('electionId');
        if (idParam) {
          this.selectedElectionId = +idParam;
          this.viewResults();
        }
      },
      error: () => {
        this.errorMessage = 'Failed to load elections.';
        this.isLoadingElections = false;
      },
    });
  }

  // Called when the user clicks "View Results"
  viewResults(): void {
    if (this.selectedElectionId === null) return;

    // Find the full election object from our already-loaded list
    this.selectedElection = this.elections.find(
      (e) => e.election_id === +this.selectedElectionId!
    ) ?? null;

    if (!this.selectedElection) return;

    // Extract candidate IDs to pass to the results endpoint
    const candidateIds = this.selectedElection.candidates.map((c) => c.candidate_id);

    this.isLoadingResults = true;
    this.errorMessage = null;
    this.candidateResults = [];
    this.winner = null;

    this.electionService.getResults(this.selectedElection.election_id, candidateIds).subscribe({
      next: (res: ResultsResponse) => {
        this.totalVotes = res.total_votes;

        // Zip backend vote counts with candidate info from the election object
        // res.results is { "1": 42, "2": 18 } — keys are strings from JSON
        this.candidateResults = this.selectedElection!.candidates.map((candidate) => {
          const votes = res.results[candidate.candidate_id.toString()] ?? 0;
          const percentage = this.totalVotes > 0
            ? Math.round((votes / this.totalVotes) * 100)
            : 0;
          return { ...candidate, votes, percentage };
        });

        // Sort descending by votes so the leading candidate is always on top
        this.candidateResults.sort((a, b) => b.votes - a.votes);

        // Winner is simply the top-sorted candidate (only if votes > 0)
        this.winner = this.totalVotes > 0 ? this.candidateResults[0] : null;

        this.isLoadingResults = false;
      },
      error: () => {
        this.errorMessage = 'Failed to fetch results. Please try again.';
        this.isLoadingResults = false;
      },
    });
  }

  // Truncate tx hash for display: "0x1234...abcd"
  truncateHash(hash: string): string {
    if (!hash || hash.length < 12) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  }

  // Copy full tx hash to clipboard
  copyHash(hash: string): void {
    navigator.clipboard.writeText(hash);
  }

  // Format ISO date string to readable format
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }
}
