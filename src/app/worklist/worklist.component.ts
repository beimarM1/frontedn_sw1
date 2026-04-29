import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../services/workflow.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-worklist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col p-8 animate-fade-in">

      <!-- Encabezado -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Bandeja de Trabajo</h1>
          <p class="text-white/40 text-sm mt-1">
            Rol activo: <span class="text-brand-primary font-semibold">{{ session?.role }}</span> ·
            {{ workItems.length }} tarea{{ workItems.length !== 1 ? 's' : '' }} pendiente{{ workItems.length !== 1 ? 's' : '' }}
          </p>
        </div>
        <button (click)="refresh()"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-all">
          🔄 Actualizar
        </button>
      </div>

      <!-- Filtros -->
      <div class="flex gap-4 mb-6 items-center">
        <span class="px-4 py-2 rounded-full text-xs font-bold border"
          style="background:rgba(99,102,241,.15);color:#818cf8;border-color:rgba(99,102,241,.3)">
          Pendientes ({{ workItems.length }})
        </span>

        <div class="relative flex-1 max-w-sm">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
          <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar por trámite o proceso..." class="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-all">
        </div>

        <select [(ngModel)]="sortBy" class="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-primary/50 text-white cursor-pointer">
          <option value="newest" class="text-black">Más recientes primero</option>
          <option value="oldest" class="text-black">Más antiguos primero</option>
          <option value="priority" class="text-black">Por prioridad (Urgentes primero)</option>
        </select>
      </div>

      <!-- Lista vacía -->
      @if (filteredItems.length === 0) {
        <div class="flex-1 flex flex-col items-center justify-center text-white/20 gap-4">
          <span style="font-size:4rem">📋</span>
          <p class="text-lg font-semibold">No hay tareas que mostrar</p>
          <p class="text-sm">Prueba ajustando los filtros de búsqueda</p>
        </div>
      }

      <!-- Tarjetas de tareas -->
      <div class="grid gap-4">
        @for (item of filteredItems; track item.id) {
          <div class="rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all overflow-hidden">
            <div class="h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div class="p-5 flex items-start gap-4">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style="background:rgba(99,102,241,.2)">⚙️</div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-mono text-white/30">#{{ item.id?.slice(-8) }}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                    style="background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.3)">
                    {{ item.estadoActual || item.status }}
                  </span>
                  @if (item.priority) {
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                      [style.background]="getPriorityColor(item.priority).bg"
                      [style.color]="getPriorityColor(item.priority).text"
                      [style.border-color]="getPriorityColor(item.priority).border">
                      {{ item.priority }}
                    </span>
                  }
                </div>
                <p class="font-semibold text-sm mb-1">
                  Tarea pendiente: <span class="text-brand-primary">{{ item._nodeName || item.currentStepId }}</span>
                </p>
                <p class="text-xs text-white/40">Proceso: {{ item._workflowName || item.workflowDefinitionId }}</p>
                <p class="text-xs text-white/30 mt-1">Iniciado: {{ item.startedAt | date:'dd/MM/yyyy HH:mm' }}</p>
              </div>
              <button (click)="abrirModal(item)"
                class="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;box-shadow:0 4px 15px rgba(99,102,241,.3)">
                ✅ Completar Tarea
              </button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- MODAL COMPLETAR TAREA -->
    @if (modalOpen && selectedItem) {
      <div class="fixed inset-0 z-50 flex items-center justify-center"
        style="background:rgba(0,0,0,.75);backdrop-filter:blur(8px)"
        (click)="cerrarModal()">
        <div class="relative w-full max-w-lg mx-4 rounded-2xl border border-white/10 overflow-hidden"
          style="background:#1e1e2e;max-height:90vh;overflow-y:auto"
          (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="p-6 border-b border-white/10"
            style="background:linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.1))">
            <div class="flex items-start justify-between">
              <div>
                <h2 class="text-xl font-bold">Completar Tarea</h2>
                <p class="text-white/50 text-sm mt-1">
                  Paso: <span class="text-indigo-400 font-semibold">{{ selectedItem.currentStepId }}</span>
                </p>
              </div>
              <button (click)="cerrarModal()"
                class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                ✕
              </button>
            </div>
          </div>

          <!-- Cuerpo -->
          <div class="p-6">
            @if (loadingForm) {
              <div class="text-center py-8 text-white/40">⏳ Cargando formulario...</div>
            } @else if (formFields.length > 0) {
              <p class="text-sm text-white/50 mb-4">Completa los campos para avanzar el proceso:</p>
              <div class="space-y-4">
                @for (field of formFields; track field.id) {
                  <div>
                    <label class="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">
                      {{ field.label }}
                      @if (field.required) { <span class="text-red-400">*</span> }
                    </label>
                    @switch (field.type) {
                      @case ('textarea') {
                        <textarea [(ngModel)]="formData[field.id]" [placeholder]="field.placeholder || ''"
                          rows="3" class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500 resize-none"
                          style="background:rgba(255,255,255,.05);color:white"></textarea>
                      }
                      @case ('select') {
                        <select [(ngModel)]="formData[field.id]"
                          class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500"
                          style="background:#1e1e2e;color:white">
                          <option value="">-- Selecciona --</option>
                          @for (opt of field.options || []; track opt) {
                            <option [value]="opt">{{ opt }}</option>
                          }
                        </select>
                      }
                      @case ('number') {
                        <input type="number" [(ngModel)]="formData[field.id]" [placeholder]="field.placeholder || ''"
                          class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500"
                          style="background:rgba(255,255,255,.05);color:white">
                      }
                      @case ('date') {
                        <input type="date" [(ngModel)]="formData[field.id]"
                          class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500"
                          style="background:rgba(255,255,255,.05);color:white">
                      }
                      @case ('file') {
                        <div class="relative">
                          <input type="file" [id]="'file-' + field.id"
                            (change)="onFileChange(field.id, $event)"
                            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                          <div class="w-full rounded-lg px-3 py-2.5 text-sm border border-white/10 flex items-center gap-3 cursor-pointer hover:border-indigo-500 transition-all"
                            style="background:rgba(255,255,255,.05);color:white">
                            <span style="color:#818cf8">📎</span>
                            <span class="text-white/50 text-xs">{{ formData[field.id] || 'Haz clic para seleccionar archivo...' }}</span>
                          </div>
                        </div>
                      }
                      @case ('checkbox') {
                        <label class="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" [(ngModel)]="formData[field.id]"
                            class="w-4 h-4 rounded">
                          <span class="text-sm text-white/70">{{ field.placeholder || 'Marcar si aplica' }}</span>
                        </label>
                      }
                      @default {
                        <input type="text" [(ngModel)]="formData[field.id]" [placeholder]="field.placeholder || ''"
                          class="w-full rounded-lg px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-500"
                          style="background:rgba(255,255,255,.05);color:white">
                      }
                    }
                  </div>
                }
              </div>
            } @else {
              <div class="text-center py-8 text-white/40">
                <div style="font-size:2.5rem">📝</div>
                <p class="mt-2 text-sm">Este paso no requiere datos adicionales.</p>
                <p class="text-xs mt-1">Al confirmar, el proceso avanzará automáticamente.</p>
              </div>
            }
            @if (errorMsg) {
              <div class="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                ⚠️ {{ errorMsg }}
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="p-6 border-t border-white/10 flex gap-3 justify-end">
            <button (click)="cerrarModal()"
              class="px-5 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/10 transition-all">
              Cancelar
            </button>
            <button (click)="completarTarea()" [disabled]="completing"
              class="px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white">
              {{ completing ? '⏳ Procesando...' : '✅ Confirmar y Avanzar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class WorklistComponent implements OnInit {
  private workflowService = inject(WorkflowService);
  private authService     = inject(AuthService);

  workItems:    any[]               = [];
  session:      any                 = null;

  // Filtros
  searchTerm: string = '';
  sortBy: string = 'newest';

  modalOpen:    boolean             = false;
  selectedItem: any                 = null;
  formFields:   any[]               = [];
  formData:     { [key: string]: any } = {};

  get filteredItems() {
    let items = [...this.workItems];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      items = items.filter(item => 
        (item._workflowName || item.workflowDefinitionId)?.toLowerCase().includes(term) ||
        (item._nodeName || item.currentStepId)?.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term)
      );
    }

    items.sort((a, b) => {
      const dateA = new Date(a.startedAt).getTime();
      const dateB = new Date(b.startedAt).getTime();
      
      switch (this.sortBy) {
        case 'newest': return dateB - dateA;
        case 'oldest': return dateA - dateB;
        case 'priority': {
          const weights: Record<string, number> = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          return (weights[b.priority] || 0) - (weights[a.priority] || 0);
        }
        default: return 0;
      }
    });

    return items;
  }

  getPriorityColor(priority: string) {
    switch (priority) {
      case 'URGENT': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      case 'HIGH':   return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'MEDIUM': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
      case 'LOW':    return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' };
      default:       return { bg: 'rgba(255, 255, 255, 0.05)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.1)' };
    }
  }

  completing:   boolean             = false;
  loadingForm:  boolean             = false;
  errorMsg:     string              = '';

  ngOnInit() {
    this.session = this.authService.getSession()();
    this.fetchWorkItems();
  }

  fetchWorkItems() {
    if (!this.session) return;
    this.workflowService.getBandejaFuncionario(this.session.role).subscribe({
      next: (items) => {
        this.workItems = items;
        // Resolver los nombres de los nodos desde cada workflow
        items.forEach(item => {
          const wfId = item.workflowDefinitionId || item.workflowId;
          if (wfId) {
            this.workflowService.getWorkflow(wfId).subscribe({
              next: (wf) => {
                item._workflowName = wf.name || wfId;
                const node = wf.nodes?.find((n: any) => n.id === item.currentStepId);
                item._nodeName = node?.label || item.currentStepId;
              },
              error: () => {}
            });
          }
        });
      },
      error: (err) => console.error('Error bandeja:', err)
    });
  }

  refresh() { this.fetchWorkItems(); }

  abrirModal(item: any) {
    this.selectedItem = item;
    this.formData     = {};
    this.formFields   = [];
    this.errorMsg     = '';
    this.modalOpen    = true;
    this.loadingForm  = true;

    const wfId = item.workflowDefinitionId || item.workflowId;
    if (wfId) {
      this.workflowService.getWorkflow(wfId).subscribe({
        next: (wf) => {
          const node = wf.nodes?.find((n: any) => n.id === item.currentStepId);
          this.formFields  = node?.form?.fields || [];
          this.loadingForm = false;
          this.formFields.forEach((f: any) => {
            this.formData[f.id] = f.defaultValue ?? '';
          });
        },
        error: () => { this.formFields = []; this.loadingForm = false; }
      });
    } else {
      this.loadingForm = false;
    }
  }

  cerrarModal() {
    this.modalOpen    = false;
    this.selectedItem = null;
    this.errorMsg     = '';
  }

  onFileChange(fieldId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Guardamos el nombre del archivo (en producción se subiría al servidor)
      this.formData[fieldId] = input.files[0].name;
    }
  }

  completarTarea() {
    if (!this.selectedItem) return;

    const missing = this.formFields
      .filter((f: any) => f.required && !this.formData[f.id])
      .map((f: any) => f.label);

    if (missing.length) {
      this.errorMsg = `Campos requeridos: ${missing.join(', ')}`;
      return;
    }

    this.completing = true;
    this.errorMsg   = '';

    this.workflowService.completarTarea(this.selectedItem.id, this.formData).subscribe({
      next: (updated) => {
        this.completing = false;
        this.cerrarModal();
        this.fetchWorkItems();
        const paso = updated?.currentStepId || 'siguiente paso';
        alert(`✅ Tarea completada.\nProceso avanzó a: "${paso}"`);
      },
      error: (err) => {
        this.completing = false;
        this.errorMsg   = err?.error?.message || 'Error al completar la tarea.';
      }
    });
  }
}
