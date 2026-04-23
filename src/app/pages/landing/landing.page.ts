import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  rocketOutline, layersOutline, trophyOutline, arrowForward
} from 'ionicons/icons';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class LandingPage {
  currentSlide = 0;

  constructor(private router: Router) {
    addIcons({ rocketOutline, layersOutline, trophyOutline, arrowForward });
  }

  nextSlide(): void {
    if (this.currentSlide < 2) this.currentSlide++;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  skipToEnd(): void {
    this.currentSlide = 2;
  }

  goToApp(): void {
    this.router.navigate(['/home']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
