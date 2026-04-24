import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonContent, IonIcon,
  ModalController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  add, trashOutline, createOutline, arrowBack, folderOpen,
  folder, briefcase, person, cart, home, book, heart, star,
  musicalNotes, airplane, car, leaf, pizza
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';

import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';
import { TaskService } from '../../services/task.service';
import { AddCategoryModal } from '../../modals/add-category/add-category.modal';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonContent, IonIcon,
  ],
})
export class CategoriesPage implements OnInit, OnDestroy {
  categories: Category[] = [];
  taskCountMap: Record<string, number> = {};

  private destroy$ = new Subject<void>();

  constructor(
    private categoryService: CategoryService,
    private taskService: TaskService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      add, trashOutline, createOutline, arrowBack, folderOpen,
      folder, briefcase, person, cart, home, book, heart, star,
      musicalNotes, airplane, car, leaf, pizza,
    });
  }

  ngOnInit(): void {
    this.categoryService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cats => {
        this.categories = cats;
        this.cdr.markForCheck();
      });

    this.taskService.tasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.taskCountMap = {};
        tasks.forEach(t => {
          if (t.categoryId) {
            this.taskCountMap[t.categoryId] = (this.taskCountMap[t.categoryId] ?? 0) + 1;
          }
        });
        this.cdr.markForCheck();
      });
  }

  trackByCategoryId(_: number, cat: Category): string { return cat.id; }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  isShoppingCategory(cat: Category): boolean {
    return cat.type === 'shopping' || cat.id === 'shopping';
  }

  async openAddCategory(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddCategoryModal,
      breakpoints: [0, 0.95, 1],
      initialBreakpoint: 0.95,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      this.categoryService.add(data);
      this.showToast('Categoría creada');
    }
  }

  async openEditCategory(cat: Category): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddCategoryModal,
      componentProps: { category: cat },
      breakpoints: [0, 0.95, 1],
      initialBreakpoint: 0.95,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      this.categoryService.update(cat.id, data);
      this.showToast('Categoría actualizada');
    }
  }

  async confirmDelete(cat: Category): Promise<void> {
    const count = this.taskCountMap[cat.id] ?? 0;
    const alert = await this.alertCtrl.create({
      header: 'Eliminar categoría',
      message: count > 0
        ? `¿Eliminar "${cat.name}"? También se eliminarán las ${count} tarea(s) asignadas.`
        : `¿Eliminar la categoría "${cat.name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.taskService.deleteByCategory(cat.id);
            this.categoryService.delete(cat.id);
            this.showToast('Categoría eliminada');
          },
        },
      ],
    });
    await alert.present();
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1500,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
