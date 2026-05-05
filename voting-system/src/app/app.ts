import { Component, HostListener, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth-service';
import { UserService } from './user-service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('voting-system');
  authService: AuthService = inject(AuthService);
  userService: UserService = inject(UserService);
  user: any;
  router = inject(Router);

  // NEW: tracks whether the hamburger menu is open or closed
  isMenuOpen = false;

  // NEW: toggles the menu on hamburger icon click
  toggleMenu(event: MouseEvent) {
    event.stopPropagation(); // prevents the document click listener from immediately closing it
    this.isMenuOpen = !this.isMenuOpen;
  }

  // NEW: closes the menu — called when a menu item is clicked
  closeMenu() {
    this.isMenuOpen = false;
  }

  // NEW: listens to clicks anywhere on the page to close the menu
  @HostListener('document:click')
  onDocumentClick() {
    this.isMenuOpen = false;
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/']);
  }

  accessSignUp() {
    this.router.navigate(['/signup']);
  }

  accessLogIn() {
    this.router.navigate(['/login']);
  }

  accessProfile() {
    this.router.navigate(['/profile']);
  }

  accessElectionsPage() {
    this.router.navigate(['/elections']);
  }

  get isAdmin(): boolean {
    const user = this.authService.getUser();
    return Array.isArray(user?.role) && user.role.includes('admin');
  }

  goToVerifyAadhaar() { this.closeMenu(); this.router.navigate(['/verify-aadhaar']); }
  goToSubmitBiometrics() { this.closeMenu(); this.router.navigate(['/biometrics']); }
  goToVoterCredentials() { this.closeMenu(); this.router.navigate(['/voter-credentials']); }
  goToAdminConsole() { this.closeMenu(); this.router.navigate(['/admin-console']); }

}
