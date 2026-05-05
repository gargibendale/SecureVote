import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from '../user-service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  signupForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.signupForm = this.fb.group({
      name: ['', Validators.required],
      dob: ['', Validators.required],
      aadhaar: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(12)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.signupForm.invalid) return;

    const { confirmPassword, ...user } = this.signupForm.value;

    if (user.password !== confirmPassword) {
      this.snackBar.open('Passwords do not match', 'Close', { duration: 3000 });
      return;
    }

    this.userService.signUp(user).subscribe({
      next: () => {
        this.snackBar.open('Signup successful!', 'Close', { duration: 3000 });
        this.router.navigate(['/login']); // ✅ redirect
      },
      error: (err) => {
        const msg = err.error?.detail || 'Signup failed';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      },
    });
  }
}
