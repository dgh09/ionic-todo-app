import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonContent, IonIcon,
  ModalController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  add, trashOutline, createOutline, gridOutline, checkmark,
  listOutline, appsOutline, searchOutline, closeCircle,
  rocketOutline, checkmarkCircle, logOutOutline,
  folder, briefcase, person, cart, home, book, heart, star,
  musicalNotes, airplane, car, leaf, pizza, sparklesOutline
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';

import { Task } from '../models/task.model';
import { Category } from '../models/category.model';
import { TaskService } from '../services/task.service';
import { CategoryService } from '../services/category.service';
import { RemoteConfigService } from '../services/remote-config.service';
import { AuthService } from '../services/auth.service';
import { AddTaskModal } from '../modals/add-task/add-task.modal';
import { AiChatModal } from '../modals/ai-chat/ai-chat.modal';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonContent, IonIcon,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  categories: Category[] = [];
  stats = { total: 0, completed: 0, active: 0 };
  selectedCategory: string | null = null;
  filterStatus: 'all' | 'active' | 'completed' = 'all';
  searchQuery = '';
  showPriority = true;
  showStatsBanner = true;
  userName = '';
  budgetData = { total: 0, spent: 0, pending: 0 };

  private categoryMap = new Map<string, Category>();
  private destroy$ = new Subject<void>();

  constructor(
    private taskService: TaskService,
    private categoryService: CategoryService,
    private remoteConfig: RemoteConfigService,
    private authService: AuthService,
    private router: Router,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      add, trashOutline, createOutline, gridOutline, checkmark,
      listOutline, appsOutline, searchOutline, closeCircle,
      rocketOutline, checkmarkCircle, logOutOutline,
      folder, briefcase, person, cart, home, book, heart, star,
      musicalNotes, airplane, car, leaf, pizza, sparklesOutline
    });
  }

  ngOnInit(): void {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.userName = user?.displayName || user?.email?.split('@')[0] || 'allí';
        this.cdr.markForCheck();
      });

    this.taskService.filteredTasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.tasks = tasks;
        this.stats = this.taskService.getStats();
        this.updateFiltered();
        this.cdr.markForCheck();
      });

    this.categoryService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cats => {
        this.categories = cats;
        this.categoryMap = new Map(cats.map(c => [c.id, c]));
        this.cdr.markForCheck();
      });

    this.remoteConfig.flags$
      .pipe(takeUntil(this.destroy$))
      .subscribe(flags => {
        this.showPriority = flags['show_priority'] as boolean;
        this.showStatsBanner = flags['show_stats_banner'] as boolean;
        this.cdr.markForCheck();
      });
  }

  private updateFiltered(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredTasks = q
      ? this.tasks.filter(t =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q)
        )
      : [...this.tasks];
    const priced = this.filteredTasks.filter(t => (t.price ?? 0) > 0);
    const total  = priced.reduce((s, t) => s + (t.price ?? 0), 0);
    const spent  = priced.filter(t => t.completed).reduce((s, t) => s + (t.price ?? 0), 0);
    this.budgetData = { total, spent, pending: total - spent };
  }

  onSearchChange(): void {
    this.updateFiltered();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.updateFiltered();
  }

  trackByTaskId(_: number, task: Task): string { return task.id; }
  trackByCategoryId(_: number, cat: Category): string { return cat.id; }

  async logout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Seguro que quieres salir?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salir',
          role: 'destructive',
          handler: async () => {
            await this.authService.signOut();
            this.router.navigate(['/'], { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedCategoryObj(): Category | undefined {
    return this.selectedCategory ? this.categoryMap.get(this.selectedCategory) : undefined;
  }

  get isShoppingView(): boolean {
    const cat = this.selectedCategoryObj;
    return cat?.type === 'shopping' || cat?.id === 'shopping';
  }

  formatCOP(value: number | undefined | null): string {
    if (value == null || isNaN(value)) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
  }

  get progress(): number {
    if (this.stats.total === 0) return 0;
    return this.stats.completed / this.stats.total;
  }

  getCategoryById(id: string | null): Category | undefined {
    return id ? this.categoryMap.get(id) : undefined;
  }

  getPriorityHex(priority: string): string {
    const map: Record<string, string> = {
      high: '#FF4757',
      medium: '#F5A623',
      low: '#2EC27E',
    };
    return map[priority] ?? '#e8e9f0';
  }

  getPriorityLabel(priority: string): string {
    const map: Record<string, string> = { high: 'Alta', medium: 'Media', low: 'Baja' };
    return map[priority] ?? priority;
  }

  selectCategory(id: string | null): void {
    this.selectedCategory = id;
    this.taskService.setFilterCategory(id);
  }

  setStatus(status: 'all' | 'active' | 'completed'): void {
    this.filterStatus = status;
    this.taskService.setFilterStatus(status);
  }

  async openAiChat(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AiChatModal,
      componentProps: { categories: this.categories },
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      cssClass: 'ai-chat-modal',
    });
    await modal.present();
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
      this.showToast('Tarea agregada ✓');
    }
  }

  async openEditTaskCard(task: Task): Promise<void> {
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
      this.showToast('Tarea actualizada ✓');
    }
  }

  async deleteTask(task: Task): Promise<void> {
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
      duration: 1800,
      position: 'bottom',
      color: 'dark',
    });
    await toast.present();
  }
}
