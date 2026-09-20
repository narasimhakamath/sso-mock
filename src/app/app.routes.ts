import { Routes } from '@angular/router';
import { SsoMock } from './pages/sso-mock/sso-mock';
import { KeyGenerator } from './pages/key-generator/key-generator';
import { SessionMonitor } from './pages/session-monitor/session-monitor';
import { TestAngular } from './pages/test-angular/test-angular';

export const routes: Routes = [
  { path: '', component: SsoMock },
  { path: 'key-generator', component: KeyGenerator },
  { path: 'session-monitor', component: SessionMonitor },
  { path: 'test-angular', component: TestAngular },
  { path: '**', redirectTo: '' },
];
