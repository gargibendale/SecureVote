import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { UserService } from '../user-service';
import { AuthService } from '../auth-service';

// The three capture steps in order
type BiometricStep = 'front' | 'left' | 'right';

@Component({
  selector: 'app-biometrics',
  standalone: true,
  imports: [FormsModule, MatProgressSpinnerModule],
  templateUrl: './biometrics.html',
  styleUrl: './biometrics.scss',
})
export class Biometrics implements OnInit, OnDestroy {

  private authService = inject(AuthService);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  user = signal<any>(null);
  isLoading = signal(false);

  // Which step the user is currently on
  currentStep = signal<BiometricStep>('front');

  // Holds the captured File for each angle
  captures: Record<BiometricStep, File | null> = {
    front: null,
    left: null,
    right: null
  };

  stream: MediaStream | null = null;

  // Step metadata — label, instruction, and which SVG overlay to show
  // This is like a config table for all three steps
  readonly steps: { key: BiometricStep; label: string; instruction: string }[] = [
    { key: 'front', label: 'Front View', instruction: 'Look straight at the camera with eyes open.' },
    { key: 'left', label: 'Turn Left (~30°)', instruction: 'Slowly turn your face left until your ear is visible.' },
    { key: 'right', label: 'Turn Right (~30°)', instruction: 'Slowly turn your face right until your ear is visible.' },
  ];

  ngOnInit(): void {
    this.user.set(this.authService.getUser());
  }

  // Returns the config object for whichever step we're on
  get currentStepMeta() {
    return this.steps.find(s => s.key === this.currentStep())!;
  }

  // Returns true only if all three images have been captured
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
      // Save the captured image under the current step key
      this.captures[step] = new File([blob], `biometric_${step}.jpg`, { type: 'image/jpeg' });

      this.snackBar.open(`✔ ${this.currentStepMeta.label} captured`, 'Close', { duration: 2000 });

      // Auto-advance to the next uncaptured step
      const next = this.steps.find(s => this.captures[s.key] === null);
      if (next) {
        this.currentStep.set(next.key);
      }
    });
  }

  stopCamera() {
    this.stream?.getTracks().forEach(track => track.stop());
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  submitBiometrics() {
    const user = this.user();
    if (!user) return;

    if (!this.allCaptured) {
      this.snackBar.open('Please capture all three angles first.', 'Close', { duration: 3000 });
      return;
    }

    const payload = {
      user_id: user.user_id,
      front_image: this.captures['front']!,
      left_image: this.captures['left']!,
      right_image: this.captures['right']!,
    };

    this.isLoading.set(true);
    this.userService.submitBiometrics(payload).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: () => {
        this.snackBar.open('✅ Biometrics submitted successfully', 'Close', { duration: 3000 });
        setTimeout(() => this.router.navigate(['/']), 1000);
      },
      error: (err) => {
        this.snackBar.open(err.error?.detail || 'Submission failed', 'Close', { duration: 3000 });
      }
    });
  }

}
