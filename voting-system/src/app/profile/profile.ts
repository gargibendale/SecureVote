import { Component, inject } from '@angular/core';
import { AuthService } from '../auth-service';
import { UserService } from '../user-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private authService = inject(AuthService);
  userService = inject(UserService);
  snackBar = inject(MatSnackBar);
  // Convert Observable to Signal (Modern standard)
  user = toSignal(this.authService.user$);
  // Converts the HTTP Observable from getMe() into a Signal.
  // The HTTP call fires once, emits the response, and the Signal holds it.
  profile = toSignal(
    this.userService.getMe(),
    { initialValue: null }
  );
  get initials(): string {
    const name = this.profile()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  formatRole(role: string): string {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
