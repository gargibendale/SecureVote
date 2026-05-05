import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { UserSignupPayload, UserPublic } from './user';
import { Observable, BehaviorSubject, tap, throwError } from 'rxjs';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  // auth state
  private _isLoggedIn$ = new BehaviorSubject<boolean>(!!localStorage.getItem('access_token'));
  public isLoggedIn$ = this._isLoggedIn$.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) { }

  signUpUrl = "http://127.0.0.1:8000/securevote/signup";
  tokenUrl = "http://127.0.0.1:8000/securevote/token";
  verifyAadhaarUrl = "http://127.0.0.1:8000/securevote/verify_aadhaar";
  collectBiometricUrl = "http://127.0.0.1:8000/securevote/collect_biometric";
  issueCredsUrl = "http://127.0.0.1:8000/securevote/issue_creds";

  signUp(user: UserSignupPayload): Observable<any> {
    return this.http.post(this.signUpUrl, user);
  }

  logIn(email: string, pass: string) {
    // OAuth2PasswordRequestForm expects form-urlencoded body with fields: grant_type(optional), username, password, scope, client_id, client_secret
    const body = new HttpParams()
      .set('username', email)
      .set('password', pass);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<{ access_token: string, token_type: string, user: any }>(this.tokenUrl, body.toString(), { headers }).pipe(
      tap(res => {
        if (res?.access_token) {
          localStorage.setItem('access_token', res.access_token);
          // optionally store token_type if you want
          this._isLoggedIn$.next(true);
          //console.log(res.user);
          this.authService.setUser(res.user);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    this._isLoggedIn$.next(false);
    this.authService.clearUser();
  }

  getMe() {
    return this.http.get<UserPublic>('http://127.0.0.1:8000/securevote/me');
  }

  verifyAadhaar(data: {
    user_id: string;
    name: string;
    dob: string;
    aadhaar: string;
    image: File;
  }): Observable<any> {

    const formData = new FormData();
    formData.append('user_id', data.user_id);
    formData.append('name', data.name);
    formData.append('dob', data.dob);
    formData.append('aadhaar', data.aadhaar);
    formData.append('image', data.image);

    return this.http.post(this.verifyAadhaarUrl, formData);
  }


  submitBiometrics(payload: {
    user_id: string;
    front_image: File;
    left_image: File;
    right_image: File;
  }): Observable<any> {
    const form = new FormData();
    form.append('user_id', payload.user_id);
    form.append('front', payload.front_image, payload.front_image.name);
    form.append('side_left', payload.left_image, payload.left_image.name);
    form.append('side_right', payload.right_image, payload.right_image.name);

    return this.http.post(this.collectBiometricUrl, form);
  }

  issueCredentials(): Observable<Blob> {
    // responseType: 'blob' tells HttpClient to treat the response as a binary file
    // rather than trying to parse it as JSON text
    return this.http.post(
      this.issueCredsUrl,
      {},
      { responseType: 'blob' }
    );
  }

}
