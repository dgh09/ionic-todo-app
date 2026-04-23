import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, add, checkmark } from 'ionicons/icons';
import { Task } from '../../models/task.model';
import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';

@Component({
  selector: 'app-add-task-modal',
  templateUrl: './add-task.modal.html',
  styleUrls: ['./add-task.modal.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
})
export class AddTaskModal implements OnInit {
  @Input() task?: Task;
  @Input() showPriority = true;

  title = '';
  description = '';
  categoryId: string | null = null;
  priority: 'low' | 'medium' | 'high' = 'medium';
  categories: Category[] = [];

  constructor(
    private modalCtrl: ModalController,
    private categoryService: CategoryService
  ) {
    addIcons({ close, add, checkmark });
  }

  ngOnInit(): void {
    this.categories = this.categoryService.getAll();
    if (this.task) {
      this.title       = this.task.title;
      this.description = this.task.description ?? '';
      this.categoryId  = this.task.categoryId;
      this.priority    = this.task.priority;
    }
  }

  get isValid(): boolean {
    return this.title.trim().length > 0;
  }

  confirm(): void {
    if (!this.isValid) return;
    this.modalCtrl.dismiss({
      title: this.title.trim(),
      description: this.description.trim(),
      categoryId: this.categoryId,
      priority: this.priority,
    }, 'confirm');
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
