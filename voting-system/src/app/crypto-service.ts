import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  /**
  * Imports a PEM-encoded Ed25519 private key and returns a CryptoKeyPair.
  *
  * Analogy: This is like feeding a key-cutting machine a blueprint (PEM text)
  * and getting back a physical key (CryptoKey object) the browser can use.
  *
  * We import as PKCS#8 format (the standard wrapper format for private keys in PEM).
  * extractable: true is required here so we can later export the public key bytes
  * for hashing. We keep the private key handle in memory only.
  */
  async importEd25519PrivateKey(pemString: string): Promise<CryptoKey> {
    const der = this.pemToDer(pemString);

    return crypto.subtle.importKey(
      'pkcs8',           // Format: standard private key envelope
      der,               // Raw bytes of the key
      { name: 'Ed25519' }, // Algorithm
      true,              // extractable: true — needed to derive public key bytes
      ['sign']           // Only allow signing — not encryption, not anything else
    );
  }

  /**
   * Given an Ed25519 private CryptoKey, derives the corresponding public key.
   *
   * Analogy: If the private key is a master mold, the public key is a cast made
   * from it — mathematically linked, but you can't reverse-engineer the mold
   * from the cast.
   *
   * Web Crypto doesn't have a direct "getPublicKey(privateKey)" function for Ed25519.
   * The trick: export the private key as JWK (JSON Web Key), which includes the
   * public key component ("x" field), then re-import just that public portion.
   */
  async derivePublicKey(privateKey: CryptoKey): Promise<CryptoKey> {
    // Export private key as JWK — this JSON blob contains both "d" (private scalar)
    // and "x" (public point). We'll discard "d" immediately.
    const jwk = await crypto.subtle.exportKey('jwk', privateKey);

    // Build a JWK containing ONLY the public key component
    const publicJwk: JsonWebKey = {
      kty: jwk.kty,   // Key type: "OKP" for Ed25519
      crv: jwk.crv,   // Curve: "Ed25519"
      x: jwk.x,       // Public key point (base64url-encoded 32 bytes)
    };

    return crypto.subtle.importKey(
      'jwk',
      publicJwk,
      { name: 'Ed25519' },
      true,          // extractable: true — we need raw bytes for hashing
      ['verify']     // Public key can only verify, never sign
    );
  }

  /**
   * Exports a public CryptoKey to raw bytes (32 bytes for Ed25519),
   * then returns the SHA-256 hex digest.
   *
   * This hex string IS the pubkey_hash your backend looks up in MongoDB.
   *
   * Analogy: We're taking the stamp impression (public key), photographing it
   * (raw bytes), then creating a unique barcode from that photo (SHA-256 hash).
   * The barcode is what gets stored and compared — compact, fixed-length, irreversible.
   */
  async getPublicKeyHash(publicKey: CryptoKey): Promise<string> {
    // Export as raw bytes — for Ed25519 this is exactly 32 bytes
    const rawBytes = await crypto.subtle.exportKey('raw', publicKey);

    // SHA-256 of those 32 bytes → produces 32 bytes (256 bits) of hash output
    const hashBuffer = await crypto.subtle.digest('SHA-256', rawBytes);

    // Convert ArrayBuffer → hex string e.g. "a3f9..."
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Strips PEM armor ("-----BEGIN...-----" / "-----END...-----") and
   * decodes the Base64 body into a raw ArrayBuffer.
   *
   * Analogy: PEM is like a letter in an envelope with a header label.
   * We're just tearing open the envelope to get the binary contents inside.
   */
  private pemToDer(pem: string): ArrayBuffer {
    const lines = pem.trim().split('\n');
    const base64 = lines
      .filter(l => !l.startsWith('-----'))  // Remove header/footer lines
      .join('');                             // Concatenate the base64 body

    const binary = atob(base64);            // Base64 → binary string
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
