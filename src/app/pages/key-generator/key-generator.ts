import { Component, signal } from '@angular/core';
import { CryptoService, KeyPair } from '../../services/crypto.service';

@Component({
  selector: 'app-key-generator',
  standalone: true,
  templateUrl: './key-generator.html',
})
export class KeyGenerator {
  keyPair = signal<KeyPair | null>(null);
  loading = signal(false);
  copied = signal<'public' | 'private' | null>(null);

  constructor(private crypto: CryptoService) {}

  async generateKeyPair() {
    this.loading.set(true);
    try {
      const pair = await this.crypto.generateKeyPair();
      this.keyPair.set(pair);
    } catch (error) {
      console.error('Failed to generate keys:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async copyToClipboard(text: string, type: 'public' | 'private') {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(type);
      setTimeout(() => this.copied.set(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  downloadKey(key: string, filename: string) {
    const blob = new Blob([key], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
