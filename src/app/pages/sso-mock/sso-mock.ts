import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CryptoService } from '../../services/crypto.service';

interface SSOUser {
  username: string;
  userId: string;
}

@Component({
  selector: 'app-sso-mock',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './sso-mock.html',
})
export class SsoMock implements OnInit, OnDestroy {
  user = signal<SSOUser | null>(null);
  username = '';
  loading = signal(false);
  error = signal('');

  angularAppUrl = 'https://dev.dfl.datanimbus.com/cx/dashboard';
  publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAstoUWsc/G+9eAMjb8R1+
uAvxVLJ5FllEE3BwS1ac7jg/rIi5aWx38nT/c9E2+EkWMyvpHH8l9zKMLPRoo+T5
5z8IYlyYuGkFK5TDLLVfyWZWwXNsx8lNs/4ZW7vhKeLy7Afow23BuiVGB6QBn1Lc
kSV3cU0XdUSCYQJ83k4TVPqArOpWIoVJHSoRyQIQtIy45pGrg1GVknfJWPxACrHE
iTJHnCaPGoohCL+vM37omxEdjU3aDcZCihdAUTatz/R8LCcgwf4jx7CeNiy6HfG2
idt1zXdzEC8cqr1Z9l/M8Pc+yCXOFyN0aSWzd9Y2cvQaKcXWjePEHAZTk26V4bPE
AwIDAQAB
-----END PUBLIC KEY-----`;

  sessionExpiry = signal<Date | null>(null);
  timeRemaining = signal(0);
  sessionWarning = signal(false);
  iframeUrl = signal<SafeResourceUrl | null>(null);

  private sessionTimeout: ReturnType<typeof setTimeout> | null = null;
  private warningTimeout: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private crypto: CryptoService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    const storedUser = sessionStorage.getItem('sso_user');
    const storedExpiry = sessionStorage.getItem('session_expiry');

    if (storedUser && storedExpiry) {
      const expiryDate = new Date(storedExpiry);
      if (expiryDate > new Date()) {
        this.user.set(JSON.parse(storedUser));
        this.sessionExpiry.set(expiryDate);
        this.startSessionTimer(expiryDate);
        this.startCountdown();
      } else {
        this.handleSessionExpired();
      }
    }
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  private clearTimers() {
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    if (this.warningTimeout) clearTimeout(this.warningTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  private startCountdown() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      const expiry = this.sessionExpiry();
      if (!expiry) return;
      const remaining = Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000));
      this.timeRemaining.set(remaining);
      if (remaining === 0) this.handleSessionExpired();
    }, 1000);
  }

  private startSessionTimer(expiry: Date) {
    const timeUntilExpiry = expiry.getTime() - Date.now();
    const timeUntilWarning = timeUntilExpiry - 60 * 1000;

    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    if (this.warningTimeout) clearTimeout(this.warningTimeout);

    if (timeUntilWarning > 0) {
      this.warningTimeout = setTimeout(() => this.sessionWarning.set(true), timeUntilWarning);
    } else {
      this.sessionWarning.set(true);
    }

    this.sessionTimeout = setTimeout(() => this.handleSessionExpired(), timeUntilExpiry);
  }

  private handleSessionExpired() {
    sessionStorage.removeItem('sso_user');
    sessionStorage.removeItem('session_expiry');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('encrypted_payload');
    this.user.set(null);
    this.sessionExpiry.set(null);
    this.sessionWarning.set(false);
    this.error.set('Session expired. Please login again.');
    this.clearTimers();
  }

  refreshSession() {
    const user = this.user();
    if (!user) return;

    const result = this.crypto.refreshSession(user.username, user.username);
    const newExpiry = new Date(result.expiresAt);
    this.sessionExpiry.set(newExpiry);
    this.sessionWarning.set(false);
    sessionStorage.setItem('session_expiry', newExpiry.toISOString());
    this.startSessionTimer(newExpiry);
    this.error.set('');
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  handleLogin() {
    if (!this.username.trim()) {
      this.error.set('Username is required');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const userData: SSOUser = { username: this.username.trim(), userId: this.username.trim() };
    const expiryDate = new Date(Date.now() + 5 * 60 * 1000);

    sessionStorage.setItem('sso_user', JSON.stringify(userData));
    sessionStorage.setItem('session_expiry', expiryDate.toISOString());

    this.user.set(userData);
    this.sessionExpiry.set(expiryDate);
    this.username = '';

    this.startSessionTimer(expiryDate);
    this.startCountdown();
    this.loading.set(false);
  }

  handleLogout() {
    sessionStorage.removeItem('sso_user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('session_expiry');
    sessionStorage.removeItem('encrypted_payload');
    this.user.set(null);
    this.sessionExpiry.set(null);
    this.error.set('');
    this.clearTimers();
  }

  async handleOpenAngularApp(mode: 'redirect' | 'iframe') {
    const user = this.user();
    if (!user) return;

    if (!this.publicKey.trim()) {
      this.error.set('Please provide a public key. You can generate one using the Key Generator page.');
      return;
    }

    this.loading.set(true);
    try {
      const encryptedPayload = await this.crypto.encryptSsoPayload(
        { userId: user.username, username: user.username },
        this.publicKey,
      );

      const configuredUrl = new URL(this.angularAppUrl);
      const ssoUrl = new URL('/cx/sso', configuredUrl.origin);
      ssoUrl.searchParams.set('payload', encryptedPayload);
      const targetUrl = ssoUrl.toString();

      this.angularAppUrl = targetUrl;

      if (mode === 'redirect') {
        this.iframeUrl.set(null);
        window.open(targetUrl, '_blank');
      } else {
        this.iframeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(targetUrl));
      }
      this.error.set('');
    } catch (err) {
      this.error.set('Failed to encrypt payload or open platform. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  hasToken(): boolean {
    return !!sessionStorage.getItem('token');
  }
}
