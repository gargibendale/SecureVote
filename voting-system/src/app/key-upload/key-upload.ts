// key-upload.component.ts
import { Component, Output, EventEmitter } from '@angular/core';
import { CryptoService } from '../crypto-service';

export interface KeyUploadResult {
  privateKey: CryptoKey;   // Stays in memory, never serialized
  pubkeyHash: string;      // SHA-256 hex — safe to send to backend
}

type UploadState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-key-upload',
  standalone: true,
  imports: [],
  templateUrl: './key-upload.html',
  styleUrl: './key-upload.scss',
})
export class KeyUpload {

  /**
  * Emits upward to the parent voting page once key processing succeeds.
  * The parent holds the result and passes it to subsequent steps (signing).
  */
  @Output() keyReady = new EventEmitter<KeyUploadResult>();

  state: UploadState = 'idle';
  errorMessage = '';
  fileName = '';
  pubkeyHashPreview = ''; // Shows first 16 chars — enough to confirm, not enough to be risky

  constructor(private crypto: CryptoService) { }
  // Add this method to the component class
  onNext(): void {
    if (this.state === 'success') {
      this.keyReady.emit();
    }
  }

  /**
   * Triggered when the user picks a file via the hidden <input type="file">.
   * We read it as text (PEM is ASCII), then pipe it through the crypto service.
   */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Basic sanity check — reject non-.pem files before wasting crypto cycles
    if (!file.name.endsWith('.pem')) {
      this.setError('Please upload a valid .pem file.');
      return;
    }

    this.state = 'loading';
    this.fileName = file.name;
    this.errorMessage = '';

    try {
      // FileReader reads the file as a UTF-8 string (PEM is always ASCII-safe)
      const pemText = await this.readFileAsText(file);

      // Step 1: Parse PEM → CryptoKey (private)
      const privateKey = await this.crypto.importEd25519PrivateKey(pemText);

      // Step 2: Derive the public key from it
      const publicKey = await this.crypto.derivePublicKey(privateKey);

      // Step 3: Hash the public key → voter identity
      const pubkeyHash = await this.crypto.getPublicKeyHash(publicKey);

      this.state = 'success';
      // Show only first 16 hex chars in UI — cosmetic confirmation, not a security risk
      this.pubkeyHashPreview = pubkeyHash.slice(0, 16) + '...';

      // Emit the result — parent stores privateKey for later signing
      this.keyReady.emit({ privateKey, pubkeyHash });

    } catch (err) {
      console.error('Key processing failed:', err);
      this.setError('Failed to parse key. Ensure this is a valid Ed25519 PEM file.');
    }
  }

  /** Programmatically clicks the hidden file input — cleaner than native button */
  triggerFileInput(): void {
    document.getElementById('pem-file-input')?.click();
  }

  private setError(msg: string): void {
    this.state = 'error';
    this.errorMessage = msg;
    this.fileName = '';
  }

  /** Wraps FileReader's callback API in a Promise for clean async/await usage */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

}
