import {
  Component, OnInit, ElementRef, ViewChild, inject, signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth-service';
import { UserService } from '../user-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-verify-aadhaar',
  standalone: true,
  imports: [FormsModule, MatProgressSpinnerModule],
  templateUrl: './verify-aadhaar.html',
  styleUrl: './verify-aadhaar.scss',
})
export class VerifyAadhaar implements OnInit {

  private authService = inject(AuthService);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  user = signal<any>(null);
  aadhaar = signal('');
  isLoading = signal(false); // ✅ loading state

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  capturedImage: File | null = null;
  stream: MediaStream | null = null;

  ngOnInit(): void {
    this.user.set(this.authService.getUser());
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
      if (blob) {
        this.capturedImage = new File([blob], "capture.jpg", {
          type: 'image/jpeg'
        });
      }
    });

    this.stopCamera();
  }

  stopCamera() {
    this.stream?.getTracks().forEach(track => track.stop());
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  verifyAadhaar() {
    const user = this.user();
    if (!user) {
      console.error("User not found");
      return;
    }
    if (!this.aadhaar() || !this.capturedImage) {
      this.snackBar.open("Please enter Aadhaar and capture image", "Close", {
        duration: 3000
      });
      return;
    }
    const payload = {
      user_id: user.user_id,
      name: user.name,
      dob: user.dob,
      aadhaar: this.aadhaar(),
      image: this.capturedImage
    };
    this.isLoading.set(true);
    this.userService.verifyAadhaar(payload).pipe(
      finalize(() => this.isLoading.set(false)) // ✅ stop loading
    ).subscribe({
      next: (res) => {
        this.snackBar.open("eKYC verification successful", "Close", {
          duration: 3000
        });
        this.user.update(u => ({ ...u, ekyc_verified: true }));
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1000);
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.detail || "Verification failed",
          "Close",
          { duration: 3000 }
        );
      }
    });
  }
}