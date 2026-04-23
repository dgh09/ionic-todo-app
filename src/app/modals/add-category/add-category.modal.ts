import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close, add, checkmark, cart,
  folder, briefcase, person, home, book, heart, star,
  musicalNotes, airplane, car, leaf, pizza
} from 'ionicons/icons';
import { Category } from '../../models/category.model';

export const CATEGORY_COLORS = [
  '#6C63FF', '#eb445a', '#2dd36f', '#ffc409',
  '#3880ff', '#ff6b35', '#00b4d8', '#92949c',
];

export const CATEGORY_ICONS = [
  'folder', 'briefcase', 'person', 'cart', 'home',
  'book', 'heart', 'star', 'musical-notes',
  'airplane', 'car', 'leaf', 'pizza',
];

@Component({
  selector: 'app-add-category-modal',
  templateUrl: './add-category.modal.html',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
})
export class AddCategoryModal implements OnInit {
  @Input() category?: Category;

  name = '';
  color = CATEGORY_COLORS[0];
  icon = CATEGORY_ICONS[0];
  isShopping = false;

  colors = CATEGORY_COLORS;
  icons = CATEGORY_ICONS;

  constructor(private modalCtrl: ModalController) {
    addIcons({ close, add, checkmark, cart, folder, briefcase, person, home, book, heart, star, musicalNotes, airplane, car, leaf, pizza });
  }

  ngOnInit(): void {
    if (this.category) {
      this.name       = this.category.name;
      this.color      = this.category.color;
      this.icon       = this.category.icon;
      this.isShopping = this.category.type === 'shopping' || this.category.id === 'shopping';
    }
  }

  get isValid(): boolean {
    return this.name.trim().length > 0;
  }

  confirm(): void {
    if (!this.isValid) return;
    this.modalCtrl.dismiss({
      name: this.name.trim(),
      color: this.color,
      icon: this.icon,
      type: this.isShopping ? 'shopping' : 'default',
    }, 'confirm');
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
