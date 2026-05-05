import { Component, OnInit, signal } from '@angular/core';
import { KeyUploadResult } from '../key-upload/key-upload';
import { KeyUpload } from '../key-upload/key-upload';
import { FaceVerify } from '../face-verify/face-verify';
import { CastVotePage } from '../cast-vote-page/cast-vote-page';
import { Election } from '../election';
import { Router } from '@angular/router';

type VotingStep = 'key-upload' | 'face-verify' | 'vote';

@Component({
  selector: 'app-vote-component',
  standalone: true,
  imports: [KeyUpload, FaceVerify, CastVotePage],
  templateUrl: './vote-component.html',
  styleUrl: './vote-component.scss',
})
export class VoteComponent {

  currentStep = signal<VotingStep>('key-upload');

  keyResult: KeyUploadResult | null = null;
  election = signal<Election | null>(null);

  // In constructor or ngOnInit, recover from router state:
  ngOnInit(): void {
    console.log('history.state:', history.state);
    const stateElection = history.state['election'] as Election | undefined;
    console.log('stateElection:', stateElection);
    if (stateElection) {
      this.election.set(stateElection);
    }
  }
  private advanceTo(step: VotingStep): void {
    if (step === 'face-verify' && !this.keyResult) {
      console.warn('Attempted to reach face-verify without a key — blocked.');
      return;
    }
    if (step === 'vote' && !this.keyResult) {
      console.warn('Attempted to reach vote without a verified identity — blocked.');
      return;
    }
    this.currentStep.set(step);
  }

  onKeyReady(result: KeyUploadResult): void {
    this.keyResult = result;
    this.advanceTo('face-verify');
  }

  onFaceVerified(): void {
    this.advanceTo('vote');
  }

}
