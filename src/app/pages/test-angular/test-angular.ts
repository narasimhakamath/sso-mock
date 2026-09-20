import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CryptoService, DecryptResult } from '../../services/crypto.service';

@Component({
  selector: 'app-test-angular',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './test-angular.html',
})
export class TestAngular implements OnInit {
  jwtToken = signal<string | null>(null);
  tokenValid = signal<boolean | null>(null);
  loading = signal(false);
  encryptedPayload = signal<string | null>(null);
  privateKey = '';
  decryptedPayload = signal<(DecryptResult & { error?: string }) | null>(null);
  decryptLoading = signal(false);

  constructor(private crypto: CryptoService) {}

  ngOnInit() {
    const token = sessionStorage.getItem('token');
    const payload = sessionStorage.getItem('encrypted_payload');
    this.jwtToken.set(token);
    this.encryptedPayload.set(payload);

    if (token) {
      this.verifyToken(token);
    }
  }

  async verifyToken(token: string) {
    this.loading.set(true);
    try {
      const result = await this.crypto.verifyToken(token);
      this.tokenValid.set(result.valid);
    } catch {
      this.tokenValid.set(false);
    } finally {
      this.loading.set(false);
    }
  }

  refreshToken() {
    const token = sessionStorage.getItem('token');
    this.jwtToken.set(token);
    if (token) {
      this.verifyToken(token);
    }
  }

  async decryptPayload() {
    const payload = this.encryptedPayload();
    if (!payload || !this.privateKey.trim()) return;

    this.decryptLoading.set(true);
    try {
      const result = this.crypto.decryptPayload(payload, this.privateKey.trim());
      if (result.success) {
        this.decryptedPayload.set(result);
      } else {
        this.decryptedPayload.set({ success: false, error: result.error });
      }
    } catch {
      this.decryptedPayload.set({ success: false, error: 'Failed to decrypt payload' });
    } finally {
      this.decryptLoading.set(false);
    }
  }
}
