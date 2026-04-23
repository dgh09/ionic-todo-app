import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { environment } from '../environments/environment';
import { RemoteConfigService } from './services/remote-config.service';
import { AuthService } from './services/auth.service';
import { TaskService } from './services/task.service';
import { CategoryService } from './services/category.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private remoteConfig: RemoteConfigService,
    private authService: AuthService,
    private taskService: TaskService,
    private categoryService: CategoryService,
  ) {}

  ngOnInit(): void {
    const firebaseConfigured = environment.firebase.apiKey !== 'YOUR_API_KEY';
    if (!firebaseConfigured) return;

    import('firebase/app').then(({ initializeApp }) => {
      try {
        const app = initializeApp(environment.firebase);
        this.remoteConfig.initialize(app);
        this.authService.initialize(app);
        this.taskService.initialize(app);
        this.categoryService.initialize(app);
      } catch (err) {
        console.warn('Firebase init error:', err);
      }
    });
  }
}
