import { Component, Input, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, add, checkmark } from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
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
export class AddTaskModal implements OnInit, OnDestroy {
  @Input() task?: Task;
  @Input() showPriority = true;

  title = '';
  description = '';
  categoryId: string | null = null;
  priority: 'low' | 'medium' | 'high' = 'medium';
  price: number | null = null;
  priceDisplay = '';
  categories: Category[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private modalCtrl: ModalController,
    private categoryService: CategoryService
  ) {
    addIcons({ close, add, checkmark });
  }

  ngOnInit(): void {
    this.categoryService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cats => (this.categories = cats));

    if (this.task) {
      this.title       = this.task.title;
      this.description = this.task.description ?? '';
      this.categoryId  = this.task.categoryId;
      this.priority    = this.task.priority;
      this.price       = this.task.price ?? null;
      if (this.price) this.priceDisplay = this.price.toLocaleString('es-CO');
    }
  }

  onPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    this.price = digits ? parseInt(digits, 10) : null;
    this.priceDisplay = this.price != null ? this.price.toLocaleString('es-CO') : '';
    input.value = this.priceDisplay;
  }

  get isShoppingSelected(): boolean {
    const cat = this.categories.find(c => c.id === this.categoryId);
    return cat?.type === 'shopping' || cat?.id === 'shopping';
  }

  formatCOP(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
  }

  get isValid(): boolean {
    return this.title.trim().length > 0;
  }

  confirm(): void {
    if (!this.isValid) return;
    const data: Record<string, any> = {
      title: this.title.trim(),
      categoryId: this.categoryId,
      priority: this.priority,
    };
    const desc = this.description.trim();
    if (desc) data['description'] = desc;
    if (this.isShoppingSelected && this.price != null && this.price > 0) {
      data['price'] = this.price;
    }
    this.modalCtrl.dismiss(data, 'confirm');
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
