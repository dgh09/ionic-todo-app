import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonFab, IonFabButton,
  IonIcon, IonList, IonItem, IonLabel, IonCheckbox, IonBadge,
  IonChip, IonButton, IonButtons, IonSegment, IonSegmentButton,
  IonItemSliding, IonItemOptions, IonItemOption, IonCard, IonCardContent,
  IonProgressBar, IonNote, IonText, IonSearchbar, IonRouterLink,
  ModalController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  add, trash, create, settingsOutline, checkmarkCircle,
  ellipseOutline, flagOutline, listOutline, searchOutline
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';

import { Task } from '../models/task.model';
import { Category } from '../models/category.model';
import { TaskService } from '../services/task.service';
import { CategoryService } from '../services/category.service';
import { RemoteConfigService } from '../services/remote-config.service';
import { AddTaskModal } from '../modals/add-task/add-task.modal';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, IonRouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFab, IonFabButton,
    IonIcon, IonList, IonItem, IonLabel, IonCheckbox, IonBadge,
    IonChip, IonButton, IonButtons, IonSegment, IonSegmentButton,
    IonItemSliding, IonItemOptions, IonItemOption, IonCard, IonCardContent,
    IonProgressBar, IonNote, IonText, IonSearchbar,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  tasks: Task[] = [];
  categories: Category[] = [];
  stats = { total: 0, completed: 0, active: 0 };
  selectedCategory: string | null = null;
  filterStatus: 'all' | 'active' | 'completed' = 'all';
  searchQuery = '';
  showPriority = true;
  showStatsBanner = true;

  private destroy$ = new Subject<void>();

  constructor(
    private taskService: TaskService,
    private categoryService: CategoryService,
    private remoteConfig: RemoteConfigService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ add, trash, create, settingsOutline, checkmarkCircle, ellipseOutline, flagOutline, listOutline, searchOutline });
  }

  ngOnInit(): void {
    this.taskService.filteredTasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.tasks = tasks;
        this.stats = this.taskService.getStats();
      });

    this.categoryService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cats => (this.categories = cats));

    this.remoteConfig.flags$
      .pipe(takeUntil(this.destroy$))
      .subscribe(flags => {
        this.showPriority = flags['show_priority'] as boolean;
        this.showStatsBanner = flags['show_stats_banner'] as boolean;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredBySearch(): Task[] {
    if (!this.searchQuery.trim()) return this.tasks;
    const q = this.searchQuery.toLowerCase();
    return this.tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q)
    );
  }

  get progress(): number {
    if (this.stats.total === 0) return 0;
    return this.stats.completed / this.stats.total;
  }

  getCategoryById(id: string | null): Category | undefined {
    if (!id) return undefined;
    return this.categories.find(c => c.id === id);
  }

  getPriorityColor(priority: string): string {
    const map: Record<string, string> = { high: 'danger', medium: 'warning', low: 'success' };
    return map[priority] ?? 'medium';
  }

  getPriorityLabel(priority: string): string {
    const map: Record<string, string> = { high: 'Alta', medium: 'Media', low: 'Baja' };
    return map[priority] ?? priority;
  }

  selectCategory(id: string | null): void {
    this.selectedCategory = id;
    this.taskService.setFilterCategory(id);
  }

  onStatusChange(event: CustomEvent): void {
    this.filterStatus = event.detail.value;
    this.taskService.setFilterStatus(this.filterStatus);
  }

  async openAddTask(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddTaskModal,
      componentProps: { showPriority: this.showPriority },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      this.taskService.add({ ...data, completed: false });
      this.showToast('Tarea agregada');
    }
  }

  async openEditTask(task: Task, sliding: IonItemSliding): Promise<void> {
    await sliding.close();
    const modal = await this.modalCtrl.create({
      component: AddTaskModal,
      componentProps: { task, showPriority: this.showPriority },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      this.taskService.update(task.id, data);
      this.showToast('Tarea actualizada');
    }
  }

  async confirmDelete(task: Task, sliding: IonItemSliding): Promise<void> {
    await sliding.close();
    const alert = await this.alertCtrl.create({
      header: 'Eliminar tarea',
      message: `¿Eliminar "${task.title}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.taskService.delete(task.id);
            this.showToast('Tarea eliminada');
          },
        },
      ],
    });
    await alert.present();
  }

  toggleTask(task: Task): void {
    this.taskService.toggle(task.id);
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
