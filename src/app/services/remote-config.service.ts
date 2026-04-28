import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

// Default feature flags (used as fallback if Firebase is not configured)
const DEFAULTS: Record<string, boolean | string | number> = {
  show_priority: true,
  show_stats_banner: true,
  enable_dark_mode_toggle: true,
  max_tasks_per_category: 50,
};

@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  private flags = new BehaviorSubject<Record<string, boolean | string | number>>(DEFAULTS);
  flags$ = this.flags.asObservable();

  private remoteConfig: any = null;

  async initialize(app: any): Promise<void> {
    try {
      const { getRemoteConfig, fetchAndActivate, getValue } = await import('firebase/remote-config');
      this.remoteConfig = getRemoteConfig(app);
      this.remoteConfig.settings = {
        minimumFetchIntervalMillis: environment.production ? 3600000 : 0,
        fetchTimeoutMillis: 10000,
      };
      this.remoteConfig.defaultConfig = DEFAULTS;

      await fetchAndActivate(this.remoteConfig);

      const resolved: Record<string, boolean | string | number> = {};
      for (const key of Object.keys(DEFAULTS)) {
        const val = getValue(this.remoteConfig, key);
        const def = DEFAULTS[key];
        if (typeof def === 'boolean') {
          resolved[key] = val.asBoolean();
        } else if (typeof def === 'number') {
          resolved[key] = val.asNumber();
        } else {
          resolved[key] = val.asString();
        }
      }
      this.flags.next(resolved);
    } catch (err) {
      console.warn('RemoteConfig: using defaults', err);
    }
  }

  getBoolean(key: string): boolean {
    return this.flags.value[key] as boolean ?? false;
  }

  getNumber(key: string): number {
    return this.flags.value[key] as number ?? 0;
  }

  getString(key: string): string {
    return this.flags.value[key] as string ?? '';
  }
}
