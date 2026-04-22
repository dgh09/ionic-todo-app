import { Component, OnInit } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { environment } from '../environments/environment';
import { RemoteConfigService } from './services/remote-config.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(private remoteConfig: RemoteConfigService) {}

  ngOnInit(): void {
    try {
      const app = initializeApp(environment.firebase);
      this.remoteConfig.initialize(app);
    } catch (err) {
      console.warn('Firebase init skipped (no config):', err);
    }
  }
}
