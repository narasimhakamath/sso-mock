import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CryptoService } from '../../services/crypto.service';

interface SessionInfo {
  userId: string;
  username: string;
  sessionExpiry: string;
  timeRemaining: number;
  isActive: boolean;
}

@Component({
  selector: 'app-session-monitor',
  standalone: true,
  templateUrl: './session-monitor.html',
})
export class SessionMonitor implements OnInit, OnDestroy {
  sessionInfo = signal<SessionInfo | null>(null);
  refreshLogs = signal<string[]>([]);
  loading = signal(false);

  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private crypto: CryptoService) {}

  ngOnInit() {
    this.updateSessionInfo();
    this.interval = setInterval(() => this.updateSessionInfo(), 1000);
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  private updateSessionInfo() {
    const storedUser = sessionStorage.getItem('sso_user');
    const storedExpiry = sessionStorage.getItem('session_expiry');

    if (storedUser && storedExpiry) {
      const user = JSON.parse(storedUser);
      const expiryDate = new Date(storedExpiry);
      const timeRemaining = Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 1000));

      this.sessionInfo.set({
        userId: user.userId,
        username: user.username,
        sessionExpiry: storedExpiry,
        timeRemaining,
        isActive: timeRemaining > 0,
      });
    } else {
      this.sessionInfo.set(null);
    }
  }

  simulateServerRefresh() {
    const info = this.sessionInfo();
    if (!info) return;

    this.loading.set(true);
    try {
      const result = this.crypto.serverRefresh(info.userId, `session_${Date.now()}`, 'your-backend-api-key');

      if (result.success && result.expiresAt) {
        sessionStorage.setItem('session_expiry', result.expiresAt);

        const logEntry = `${new Date().toLocaleTimeString()}: Server refreshed session for ${info.username}`;
        this.refreshLogs.update((logs) => [logEntry, ...logs.slice(0, 9)]);

        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to simulate server refresh:', error);
    } finally {
      this.loading.set(false);
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  toLocaleTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString();
  }
}
