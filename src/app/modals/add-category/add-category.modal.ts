import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonInput, IonIcon,
  IonSelect, IonSelectOption, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  folder, briefcase, person, cart, home, book, heart, star,
  musicalNotes, airplane, car, leaf, pizza
} from 'ionicons/icons';
import { Category } from '../../models/category.model';

export const CATEGORY_COLORS = [
  '#3880ff', '#eb445a', '#2dd36f', '#ffc409',
  '#92949c', '#6a64ff', '#ff6b35', '#00b4d8',
];

export const CATEGORY_ICONS = [
  'folder', 'briefcase', 'person', 'cart', 'home',
  'book', 'heart', 'star', 'musical-notes',
  'airplane', 'car', 'leaf', 'pizza',
];

@Component({
  selector: 'app-add-category-modal',
  templateUrl: './add-category.modal.html',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonInput, IonIcon,
    IonSelect, IonSelectOption
  ],
})
export class AddCategoryModal implements OnInit {
  @Input() category?: Category;

  name = '';
  color = CATEGORY_COLORS[0];
  icon = CATEGORY_ICONS[0];

  colors = CATEGORY_COLORS;
  icons = CATEGORY_ICONS;

  constructor(private modalCtrl: ModalController) {
    addIcons({ folder, briefcase, person, cart, home, book, heart, star, musicalNotes, airplane, car, leaf, pizza });
  }

  ngOnInit(): void {
    if (this.category) {
      this.name = this.category.name;
      this.color = this.category.color;
      this.icon = this.category.icon;
    }
  }

  get isValid(): boolean {
    return this.name.trim().length > 0;
  }

  confirm(): void {
    if (!this.isValid) return;
    this.modalCtrl.dismiss({ name: this.name.trim(), color: this.color, icon: this.icon }, 'confirm');
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
