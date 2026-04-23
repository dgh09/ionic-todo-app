import { Component, OnInit, OnDestroy } from '@angular/core';
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
  musicalNotes, airplane, car, leaf, pizza
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';

import { Task } from '../models/task.model';
import { Category } from '../models/category.model';
import { TaskService } from '../services/task.service';
import { CategoryService } from '../services/category.service';
import { RemoteConfigService } from '../services/remote-config.service';
import { AuthService } from '../services/auth.service';
import { AddTaskModal } from '../modals/add-task/add-task.modal';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonContent, IonIcon,
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
  userName = '';

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
  ) {
    addIcons({
      add, trashOutline, createOutline, gridOutline, checkmark,
      listOutline, appsOutline, searchOutline, closeCircle,
      rocketOutline, checkmarkCircle, logOutOutline,
      folder, briefcase, person, cart, home, book, heart, star,
      musicalNotes, airplane, car, leaf, pizza
    });
  }

  ngOnInit(): void {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.userName = user?.displayName || user?.email?.split('@')[0] || 'allí';
      });

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
