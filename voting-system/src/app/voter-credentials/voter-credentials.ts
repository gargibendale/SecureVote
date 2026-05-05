import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../user-service';
import { AuthService } from '../auth-service';

type PageState = 'idle' | 'loading' | 'success' | 'already_issued' | 'error';

@Component({
  selector: 'app-voter-credentials',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voter-credentials.html',
  styleUrl: './voter-credentials.scss',
})
export class VoterCredentials implements OnInit {

  private userService = inject(UserService);
  private authService = inject(AuthService);

  state: PageState = 'idle';
  errorMessage = '';
  user = signal<any>(null);

  ngOnInit(): void {
    this.user.set(this.authService.getUser());
  }

  getCredentials(): void {
    this.state = 'loading';
    const user = this.user();
    const user_name = user.name;

    this.userService.issueCredentials().subscribe({
      next: (blob: Blob) => {
        // Programmatically trigger a file download in the browser:
        // 1. Create a temporary object URL pointing to the blob data
        const url = window.URL.createObjectURL(blob);
        // 2. Create an invisible <a> tag and set its href to the object URL
        const a = document.createElement('a');
        a.href = url;
        a.download = 'voter_private_key.pem'; // filename the user sees
        // 3. Programmatically click the link to trigger the download dialog
        a.click();
        // 4. Clean up the temporary URL from memory
        window.URL.revokeObjectURL(url);

        this.state = 'success';
      },
      error: (err) => {
        // 400 means credentials were already issued previously
        if (err.status === 400) {
          this.state = 'already_issued';
        } else {
          this.state = 'error';
          this.errorMessage = err.error?.detail || 'An unexpected error occurred.';
        }
      }
    });
  }

  reset(): void {
    this.state = 'idle';
  }

}
