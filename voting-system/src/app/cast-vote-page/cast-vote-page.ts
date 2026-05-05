import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, signal, inject,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Election, Candidate } from '../election';
import { KeyUploadResult } from '../key-upload/key-upload';
import { ElectionService } from '../election-service';
// Add to imports at the top
import { firstValueFrom } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-cast-vote-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cast-vote-page.html',
  styleUrl: './cast-vote-page.scss',
})
export class CastVotePage implements OnInit, OnDestroy {
  @Input({ required: true }) election!: Election;
  @Input({ required: true }) keyResult!: KeyUploadResult;

  selectedCandidate = signal<Candidate | null>(null);
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);

  // private lastResetTime = 0;
  // private readonly THROTTLE_MS = 500;

  // Inactivity timeout — 10 minutes
  private readonly INACTIVITY_MS = 2 * 60 * 1000;
  private readonly WARN_BEFORE_MS = 60 * 1000;        // warn 60s before expiry
  private timerStarted = false;                        // guard: start only once
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private warnTimer: ReturnType<typeof setTimeout> | null = null;
  showTimeoutWarning = signal(false);

  private router = inject(Router);
  private voteApi = inject(ElectionService);
  private ngZone = inject(NgZone);
  private snackBar = inject(MatSnackBar);

  startSessionTimer(): void {
    if (this.timerStarted) return;                     // never reset, never restart
    this.timerStarted = true;

    this.ngZone.runOutsideAngular(() => {
      this.warnTimer = setTimeout(() => {
        this.ngZone.run(() => this.showTimeoutWarning.set(true));
      }, this.INACTIVITY_MS - this.WARN_BEFORE_MS);

      this.inactivityTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.router.navigate(['/vote', this.election.election_id], { replaceUrl: true });
          window.location.reload();
        });
      }, this.INACTIVITY_MS);
    });
  }

  ngOnInit(): void {
    this.startSessionTimer();   // clock starts ticking immediately, no way to reset

  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // ── Inactivity timer ──────────────────────────────────────────────
  private clearTimers(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.warnTimer) clearTimeout(this.warnTimer);
  }

  // resetInactivityTimer(): void {
  //   this.clearTimers();
  //   this.showTimeoutWarning.set(false);

  //   // Run timers outside Angular zone (efficient),
  //   // but re-enter when updating signals (so UI updates)
  //   this.ngZone.runOutsideAngular(() => {

  //     this.warnTimer = setTimeout(() => {
  //       this.ngZone.run(() => this.showTimeoutWarning.set(true)); // re-enter zone
  //     }, this.INACTIVITY_MS - this.WARN_BEFORE_MS);

  //     this.inactivityTimer = setTimeout(() => {
  //       this.ngZone.run(() => {
  //         this.router.navigate(['/vote', this.election.election_id], {
  //           replaceUrl: true,
  //         });
  //         window.location.reload();
  //       });
  //     }, this.INACTIVITY_MS);

  //   });
  // }

  // onUserActivity(): void {
  //   const now = Date.now();
  //   if (now - this.lastResetTime < this.THROTTLE_MS) return;
  //   this.lastResetTime = now;
  //   this.resetInactivityTimer();
  // }

  // ── Candidate selection ───────────────────────────────────────────
  selectCandidate(candidate: Candidate): void {
    this.selectedCandidate.set(candidate);
    this.submitError.set(null);
    //this.resetInactivityTimer(); // reset on any interaction
  }

  // ── Vote submission ───────────────────────────────────────────────
  async submitVote(): Promise<void> {
    const candidate = this.selectedCandidate();
    if (!candidate || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.submitError.set(null);

    try {
      const nonce = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Build the canonical message string — must match backend's build_vote_message()
      const message = JSON.stringify(
        {
          candidate_id: Number(candidate.candidate_id),   // ← c before e
          election_id: Number(this.election.election_id),
          nonce,
          timestamp,
        },
        null,
        0
      );
      const messageBytes = new TextEncoder().encode(message);
      console.log('Message being signed:', message);  // 👈 add this

      // Sign with the private key from key-upload step
      const signatureBytes = await crypto.subtle.sign(
        { name: 'Ed25519' },            // Ed25519 via WebCrypto
        this.keyResult.privateKey,      // CryptoKey from KeyUploadResult
        messageBytes
      );

      const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

      const payload = {
        pubkey_hash: this.keyResult.pubkeyHash,
        election_id: this.election.election_id,
        candidate_id: candidate.candidate_id,
        nonce,
        timestamp,      // add this
        signature,
      };

      // Replace the deprecated call
      await firstValueFrom(this.voteApi.castVote(payload));

      this.snackBar.open('Your vote has been submitted successfully!', undefined, {
        duration: 3000,               // auto-dismiss after 3 seconds
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['success-snackbar'], // custom CSS class for styling
      });

      // slight delay so user sees the snackbar before navigating away
      setTimeout(() => {
        this.router.navigate(['/'], { replaceUrl: true });
      }, 3000);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vote submission failed. Please try again.';
      this.submitError.set(msg);
      this.isSubmitting.set(false);
    }
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }
}
