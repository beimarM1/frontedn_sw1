import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BpmnNodeType = 'START' | 'END' | 'TASK' | 'SERVICE' | 'GATEWAY_XOR' | 'GATEWAY_AND' | 'AGENT' | 'TIMER' | 'MAIL';

export interface PaletteItem {
  type: BpmnNodeType;
  label: string;
  title: string;
  group: 'events' | 'tasks' | 'gateways' | 'ai';
}

@Component({
  selector: 'app-bpmn-palette',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute left-3 top-4 w-14 bg-white border border-slate-200 shadow-xl rounded-xl z-30 flex flex-col items-center py-3 gap-1 select-none"
         style="top: 56px;">

      <!-- Grupo: Eventos -->
      <span class="text-[8px] text-slate-300 uppercase tracking-widest mb-1">Eventos</span>

      <!-- START: Círculo verde borde fino -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'START')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Evento de Inicio">
        <svg width="28" height="28" viewBox="-14 -14 28 28">
          <circle r="12" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
        </svg>
      </div>

      <!-- END: Círculo rojo borde grueso -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'END')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Evento de Fin">
        <svg width="28" height="28" viewBox="-14 -14 28 28">
          <circle r="12" fill="#fee2e2" stroke="#dc2626" stroke-width="4"/>
          <circle r="7" fill="#dc2626"/>
        </svg>
      </div>

      <!-- TIMER -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'TIMER')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Evento Temporizador">
        <svg width="28" height="28" viewBox="-14 -14 28 28">
          <circle r="12" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
          <line x1="0" y1="0" x2="0" y2="-7" stroke="#d97706" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="5" y2="3" stroke="#d97706" stroke-width="1.5" stroke-linecap="round"/>
          <circle r="1.5" fill="#d97706"/>
        </svg>
      </div>

      <div class="w-8 h-px bg-slate-100 my-1"></div>

      <!-- Grupo: Tareas -->
      <span class="text-[8px] text-slate-300 uppercase tracking-widest mb-1">Tareas</span>

      <!-- TASK: Tarea Manual (icono persona) -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'TASK')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Tarea Manual">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <rect x="1" y="1" width="26" height="26" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
          <!-- Icono persona -->
          <circle cx="9" cy="10" r="3" fill="#64748b"/>
          <path d="M4 20 Q4 15 9 15 Q14 15 14 20" fill="#64748b"/>
        </svg>
      </div>

      <!-- SERVICE: Tarea de Servicio (icono engranaje) -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'SERVICE')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Tarea de Servicio">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <rect x="1" y="1" width="26" height="26" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
          <!-- Engranaje simple -->
          <circle cx="14" cy="14" r="5" fill="none" stroke="#64748b" stroke-width="2"/>
          <circle cx="14" cy="14" r="2" fill="#64748b"/>
          <line x1="14" y1="7" x2="14" y2="9" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
          <line x1="14" y1="19" x2="14" y2="21" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
          <line x1="7" y1="14" x2="9" y2="14" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
          <line x1="19" y1="14" x2="21" y2="14" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- MAIL -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'MAIL')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Tarea de Correo">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <rect x="1" y="1" width="26" height="26" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
          <rect x="5" y="9" width="18" height="12" rx="1" fill="none" stroke="#3b82f6" stroke-width="1.5"/>
          <path d="M5 9 L14 16 L23 9" fill="none" stroke="#3b82f6" stroke-width="1.5"/>
        </svg>
      </div>

      <div class="w-8 h-px bg-slate-100 my-1"></div>

      <!-- Grupo: Compuertas -->
      <span class="text-[8px] text-slate-300 uppercase tracking-widest mb-1">Compuertas</span>

      <!-- GATEWAY XOR: Diamante con X -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'GATEWAY_XOR')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Compuerta Exclusiva (XOR)">
        <svg width="28" height="28" viewBox="-14 -14 28 28">
          <polygon points="0,-12 12,0 0,12 -12,0" fill="#fefce8" stroke="#ca8a04" stroke-width="1.5"/>
          <line x1="-5" y1="-5" x2="5" y2="5" stroke="#ca8a04" stroke-width="2" stroke-linecap="round"/>
          <line x1="5" y1="-5" x2="-5" y2="5" stroke="#ca8a04" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- GATEWAY AND: Diamante con + -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'GATEWAY_AND')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Compuerta Paralela (AND)">
        <svg width="28" height="28" viewBox="-14 -14 28 28">
          <polygon points="0,-12 12,0 0,12 -12,0" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
          <line x1="0" y1="-6" x2="0" y2="6" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="-6" y1="0" x2="6" y2="0" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>

      <div class="w-8 h-px bg-slate-100 my-1"></div>

      <!-- Grupo: IA -->
      <span class="text-[8px] text-slate-300 uppercase tracking-widest mb-1">IA</span>

      <!-- AGENT -->
      <div draggable="true"
           (dragstart)="dragStart($event, 'AGENT')"
           class="group w-10 h-10 flex items-center justify-center hover:bg-indigo-50 rounded-lg cursor-grab active:cursor-grabbing transition-all"
           title="Agente de IA">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <rect x="1" y="1" width="26" height="26" rx="4" fill="#eef2ff" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="4 2"/>
          <text x="14" y="19" text-anchor="middle" font-size="14">✨</text>
        </svg>
      </div>
    </div>
  `
})
export class BpmnPaletteComponent {
  @Output() nodeDragStart = new EventEmitter<BpmnNodeType>();

  dragStart(event: DragEvent, type: BpmnNodeType) {
    event.dataTransfer?.setData('nodeType', type);
    this.nodeDragStart.emit(type);
  }
}
