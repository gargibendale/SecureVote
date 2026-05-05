import { Component, OnInit, OnDestroy, ViewChild, ElementRef, output, inject, signal } from '@angular/core';
import { AuthService } from '../auth-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { ElectionService } from '../election-service';

type FaceStep = 'front' | 'left' | 'right';

@Component({
  selector: 'app-face-verify',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  templateUrl: './face-verify.html',
  styleUrl: './face-verify.scss',
})
export class FaceVerify {
  private authService = inject(AuthService);
  private electionService = inject(ElectionService);
  private snackBar = inject(MatSnackBar);
  faceVerified = output<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  user = signal<any>(null);
  isLoading = signal(false);
  currentStep = signal<FaceStep>('front');

  captures: Record<FaceStep, File | null> = {
    front: null,
    left: null,
    right: null,
  };

  stream: MediaStream | null = null;

  readonly steps: { key: FaceStep; label: string; instruction: string }[] = [
    { key: 'front', label: 'Front View', instruction: 'Look straight at the camera with eyes open.' },
    { key: 'left', label: 'Turn Left (~30°)', instruction: 'Slowly turn your face left until your ear is visible.' },
    { key: 'right', label: 'Turn Right (~30°)', instruction: 'Slowly turn your face right until your ear is visible.' },
  ];
  ngOnInit(): void {
    this.user.set(this.authService.getUser());
  }

  get currentStepMeta() {
    return this.steps.find(s => s.key === this.currentStep())!;
  }

  get allCaptured(): boolean {
    return this.steps.every(s => this.captures[s.key] !== null);
  }

  async startCamera() {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
    this.videoElement.nativeElement.srcObject = this.stream;
  }

  captureImage() {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const step = this.currentStep();
      this.captures[step] = new File([blob], `verify_${step}.jpg`, { type: 'image/jpeg' });
      this.snackBar.open(`✔ ${this.currentStepMeta.label} captured`, 'Close', { duration: 2000 });
      const next = this.steps.find(s => this.captures[s.key] === null);
      if (next) this.currentStep.set(next.key);
    });
  }

  stopCamera() {
    this.stream?.getTracks().forEach(track => track.stop());
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  verifyFace() {
    const user = this.user();
    if (!user || !this.allCaptured) return;
    // NOTE: the backend field names are side_left_image / side_right_image
    // not left_image / right_image — match the Form(...) parameter names exactly
    const payload = {
      userId: user.user_id,
      front: this.captures['front']!,
      sideLeft: this.captures['left']!,
      sideRight: this.captures['right']!,
    };
    this.isLoading.set(true);
    this.electionService.verifyFace(payload).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (res) => {
        if (res.verified) {
          this.stopCamera(); // release webcam before navigating away
          this.snackBar.open('Face verified successfully', 'Close', { duration: 2500 });
          this.faceVerified.emit();  // tell the parent to advance to 'vote'
        } else {
          // Backend responded 200 but verification failed (scores below threshold)
          const score = res.score;
          this.snackBar.open(
            `Verification failed. Score: ${score} (threshold: ${res.threshold})`,
            'Close',
            { duration: 6000 }
          );
          // Reset captures so the user can try again cleanly
          this.captures = { front: null, left: null, right: null };
          this.currentStep.set('front');
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.detail || 'Verification request failed', 'Close', { duration: 3000 });
      }
    });
  }

}
