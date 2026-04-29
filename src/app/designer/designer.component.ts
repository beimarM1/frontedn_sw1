import { Component, OnInit, OnDestroy, HostListener, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

import {
  WorkflowService,
  WorkflowNode,
  WorkflowEdge,
  WorkflowDefinition,
  WorkflowLane,
} from '../services/workflow.service';
import {
  WorkflowSocketService,
  WorkflowUpdate,
  NodeMovePayload,
} from '../services/workflow-socket.service';
import { HistoryService } from '../services/history.service';
import { ElevenLabsService } from '../services/eleven-labs.service';
import { BpmnPaletteComponent } from './bpmn-palette/bpmn-palette.component';
import { PropertiesPanelComponent } from './properties-panel/properties-panel.component';
import { AiBarComponent } from './ai-bar/ai-bar.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-designer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BpmnPaletteComponent,
    PropertiesPanelComponent,
    AiBarComponent,
  ],
  template: `
    <div class="h-screen flex flex-col bg-[#f8f9fa] font-sans select-none overflow-hidden">
      <!-- ── Toolbar ── -->
      <header
        class="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between z-20 shadow-sm flex-shrink-0"
      >
        <div class="flex items-center gap-2">
          <!-- Botón volver al Dashboard -->
          <a
            routerLink="/dashboard"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all text-[10px] font-medium"
            title="Volver al Panel General"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Dashboard
          </a>
          <div class="w-px h-4 bg-slate-200"></div>
          <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1" fill="white" opacity=".8" />
              <rect x="9" y="1" width="6" height="6" rx="1" fill="white" opacity=".5" />
              <rect x="1" y="9" width="6" height="6" rx="1" fill="white" opacity=".5" />
              <rect x="9" y="9" width="6" height="6" rx="1" fill="white" />
            </svg>
          </div>
          <div>
            <h1 class="text-xs font-bold text-slate-800 leading-none">
              {{ workflow?.name || 'Nuevo Proceso' }}
            </h1>
            <p class="text-[9px] text-slate-400 mt-0.5">
              iBPM Designer · v{{ workflow?.version || 1 }}
            </p>
          </div>
        </div>

        <!-- Avatares colaboradores demo (REQ-10) -->
        <div class="flex items-center gap-3">
          <div class="flex -space-x-2" title="Usuarios conectados">
            @for (u of activeUsers; track u.id) {
              <div
                class="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                [style.background]="u.color"
                [title]="u.name"
              >
                {{ u.name[0] }}
              </div>
            }
          </div>
          <div
            class="flex items-center gap-1 px-2 py-0.5 bg-green-50 rounded-full border border-green-100"
          >
            <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span class="text-[9px] text-green-700 font-bold"
              >{{ activeUsers.length }} en línea</span
            >
          </div>

          <!-- Undo/Redo -->
          <div class="flex items-center gap-1 border-l border-slate-200 pl-3">
            <button
              (click)="undo()"
              [disabled]="!history.canUndo()"
              class="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-all text-slate-600"
              title="Deshacer (Ctrl+Z)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>
            <button
              (click)="redo()"
              [disabled]="!history.canRedo()"
              class="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-all text-slate-600"
              title="Rehacer (Ctrl+Y)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
              </svg>
            </button>
          </div>

          <div class="border-l border-slate-200 pl-3 flex items-center gap-2">
            <button
              (click)="addLane()"
              title="Añadir Carril"
              class="text-[10px] border border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Carril
            </button>
            <button
              (click)="saveWorkflow()"
              class="text-[10px] bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all font-medium"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Guardar
            </button>
            <button
              (click)="launchProcess()"
              class="text-[10px] bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-bold shadow-sm"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Ejecutar
            </button>
            <div class="w-px h-5 bg-slate-200 ml-1"></div>
            <!-- Botón Cerrar Sesión -->
            <button
              (click)="logout()"
              title="Cerrar Sesión"
              class="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center gap-1"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- ── Cuerpo ── -->
      <div class="flex-1 flex overflow-hidden relative">
        <!-- Paleta BPMN 2.0 -->
        <app-bpmn-palette></app-bpmn-palette>

        <!-- Lienzo SVG -->
        <div
          class="flex-1 overflow-hidden relative bg-white"
          id="workflow-canvas"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event)"
        >
          <svg
            #svgCanvas
            width="100%"
            height="100%"
            class="absolute inset-0"
            (mousedown)="onCanvasMouseDown($event)"
            (mousemove)="onMouseMove($event)"
            (mouseup)="onMouseUp()"
          >
            <defs>
              <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill="#e2e8f0" />
              </pattern>
              <!-- Flecha estándar BPMN: sólida, visible y con punta clara -->
              <marker
                id="arrow"
                markerWidth="12"
                markerHeight="10"
                refX="10"
                refY="5"
                orient="auto"
              >
                <polygon points="0 0, 12 5, 0 10" fill="#fbbf24" />
              </marker>
              <!-- Flecha para arista seleccionada -->
              <marker
                id="arrow-selected"
                markerWidth="12"
                markerHeight="10"
                refX="10"
                refY="5"
                orient="auto"
              >
                <polygon points="0 0, 12 5, 0 10" fill="#3b82f6" />
              </marker>
              <!-- Flecha preview para modo conexión -->
              <marker
                id="arrow-preview"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
              </marker>
            </defs>

            <!-- Fondo con puntos -->
            <rect width="100%" height="100%" fill="url(#dots)" />

            <!-- Swimlanes - doble clic para renombrar -->
            @for (lane of workflow?.lanes; track lane.id; let i = $index) {
              <g [attr.transform]="'translate(' + i * laneWidth + ', 0)'">
                <rect
                  [attr.width]="laneWidth"
                  height="4000"
                  fill="transparent"
                  stroke="#e2e8f0"
                  stroke-width="1"
                />
                <rect
                  [attr.width]="laneWidth"
                  height="32"
                  fill="#f8fafc"
                  stroke="#e2e8f0"
                  stroke-width="1"
                  class="cursor-pointer"
                  (dblclick)="renameLane(lane)"
                />
                <text
                  [attr.x]="laneWidth / 2"
                  y="18"
                  text-anchor="middle"
                  fill="#64748b"
                  font-size="10"
                  font-weight="700"
                  class="uppercase tracking-widest"
                  style="cursor:pointer"
                  (dblclick)="renameLane(lane)"
                >
                  ✎ {{ lane.name }}
                </text>
                <!-- Botón X para borrar el carril (solo si hay más de 1) -->
                @if ((workflow?.lanes?.length || 0) > 1) {
                  <text
                    [attr.x]="laneWidth - 12"
                    y="18"
                    fill="#f87171"
                    font-size="12"
                    font-weight="bold"
                    class="cursor-pointer"
                    style="cursor:pointer"
                    (click)="deleteLane(lane)"
                    title="Eliminar carril"
                  >
                    ✕
                  </text>
                }
              </g>
            }

            <!-- Conectores: clic para seleccionar, azul si activo -->
            @for (edge of workflow?.edges; track edge.id) {
              <!-- Área invisible más ancha para facilitar el clic -->
              <path
                [attr.d]="getPath(edge)"
                fill="none"
                stroke="transparent"
                stroke-width="12"
                class="cursor-pointer"
                (click)="selectEdge(edge)"
              />
              <!-- Línea visible -->
              <path
                [attr.d]="getPath(edge)"
                fill="none"
                [attr.stroke]="selectedEdge?.id === edge.id ? '#3b82f6' : '#fbbf24'"
                [attr.stroke-width]="selectedEdge?.id === edge.id ? 3 : 2.5"
                [attr.marker-end]="selectedEdge?.id === edge.id ? 'url(#arrow-selected)' : 'url(#arrow)'"
                class="pointer-events-none"
              />
              @if (edge.label) {
                <text
                  [attr.x]="getEdgeMidX(edge)"
                  [attr.y]="getEdgeMidY(edge) - 6"
                  text-anchor="middle"
                  fill="#64748b"
                  font-size="9"
                  class="pointer-events-none"
                  style="font-weight:600"
                >
                  {{ edge.label }}
                </text>
              }
              <!-- Botón ✕ en el medio de la flecha seleccionada -->
              @if (selectedEdge?.id === edge.id) {
                <g
                  [attr.transform]="
                    'translate(' + getEdgeMidX(edge) + ',' + getEdgeMidY(edge) + ')'
                  "
                  class="cursor-pointer"
                  (click)="deleteSelectedEdge()"
                  title="Eliminar flecha"
                >
                  <circle r="9" fill="#ef4444" />
                  <text
                    text-anchor="middle"
                    y="4"
                    fill="white"
                    font-size="11"
                    font-weight="bold"
                    class="pointer-events-none"
                  >
                    ✕
                  </text>
                </g>
              }
            }

            <!-- Línea PREVIEW modo conexión -->
            @if (connectingFrom && connectPreview) {
              <line
                [attr.x1]="connectingFrom.x"
                [attr.y1]="connectingFrom.y"
                [attr.x2]="connectPreview.x"
                [attr.y2]="connectPreview.y"
                stroke="#3b82f6"
                stroke-width="2"
                stroke-dasharray="6 3"
                marker-end="url(#arrow-preview)"
                pointer-events="none"
              />
            }

            <!-- Nodos BPMN 2.0 -->
            @for (node of workflow?.nodes; track node.id) {
              <g
                [attr.transform]="'translate(' + (node.x || 200) + ',' + (node.y || 200) + ')'"
                (mousedown)="onNodeMouseDown($event, node)"
                (mouseup)="finishConnect(node)"
                [class.opacity-50]="draggingNode && draggingNode.id !== node.id"
                class="cursor-move"
              >
                <!-- ── Marca de posición para el usuario final (Tracker) ── -->
                @if (activeNodeId === node.id) {
                  <circle
                    r="24"
                    fill="none"
                    stroke="#fbbf24"
                    stroke-width="4"
                    class="pointer-events-none"
                    style="filter: drop-shadow(0 0 8px #fbbf24);"
                  >
                    <animate attributeName="r" values="24;28;24" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                }
                <!-- Selección highlight -->
                @if (selectedNode?.id === node.id) {
                  <rect
                    x="-58"
                    y="-38"
                    width="116"
                    height="76"
                    rx="8"
                    fill="none"
                    stroke="#3b82f6"
                    stroke-width="2"
                    stroke-dasharray="4 2"
                    opacity=".7"
                  />
                }

                <!-- Figura según tipo -->
                @switch (node.type) {
                  @case ('START') {
                    <circle r="18" fill="#dcfce7" stroke="#16a34a" stroke-width="2" />
                  }
                  @case ('END') {
                    <circle r="18" fill="#fee2e2" stroke="#dc2626" stroke-width="4" />
                    <circle r="10" fill="#dc2626" />
                  }
                  @case ('GATEWAY_XOR') {
                    <polygon
                      points="0,-22 22,0 0,22 -22,0"
                      fill="#fefce8"
                      stroke="#ca8a04"
                      stroke-width="1.5"
                    />
                    <line
                      x1="-7"
                      y1="-7"
                      x2="7"
                      y2="7"
                      stroke="#ca8a04"
                      stroke-width="2.5"
                      stroke-linecap="round"
                    />
                    <line
                      x1="7"
                      y1="-7"
                      x2="-7"
                      y2="7"
                      stroke="#ca8a04"
                      stroke-width="2.5"
                      stroke-linecap="round"
                    />
                  }
                  @case ('GATEWAY_AND') {
                    <polygon
                      points="0,-22 22,0 0,22 -22,0"
                      fill="#f0fdf4"
                      stroke="#16a34a"
                      stroke-width="1.5"
                    />
                    <line
                      x1="0"
                      y1="-10"
                      x2="0"
                      y2="10"
                      stroke="#16a34a"
                      stroke-width="3"
                      stroke-linecap="round"
                    />
                    <line
                      x1="-10"
                      y1="0"
                      x2="10"
                      y2="0"
                      stroke="#16a34a"
                      stroke-width="3"
                      stroke-linecap="round"
                    />
                  }
                  @case ('TIMER') {
                    <circle r="18" fill="#fef3c7" stroke="#d97706" stroke-width="2" />
                    <line
                      x1="0"
                      y1="-10"
                      x2="0"
                      y2="0"
                      stroke="#d97706"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <line
                      x1="0"
                      y1="0"
                      x2="7"
                      y2="4"
                      stroke="#d97706"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  }
                  @case ('AGENT') {
                    <rect
                      x="-50"
                      y="-28"
                      width="100"
                      height="56"
                      rx="6"
                      fill="#eef2ff"
                      stroke="#6366f1"
                      stroke-width="1.5"
                      stroke-dasharray="5 3"
                    />
                    <text x="-30" y="5" font-size="16" class="pointer-events-none">✨</text>
                  }
                  @case ('MAIL') {
                    <rect
                      x="-50"
                      y="-28"
                      width="100"
                      height="56"
                      rx="4"
                      fill="#eff6ff"
                      stroke="#3b82f6"
                      stroke-width="1.5"
                    />
                    <rect
                      x="-30"
                      y="-14"
                      width="60"
                      height="28"
                      rx="2"
                      fill="none"
                      stroke="#3b82f6"
                      stroke-width="1.2"
                    />
                    <path
                      d="M-30 -14 L0 4 L30 -14"
                      fill="none"
                      stroke="#3b82f6"
                      stroke-width="1.2"
                    />
                  }
                  @case ('SERVICE') {
                    <rect
                      x="-50"
                      y="-28"
                      width="100"
                      height="56"
                      rx="4"
                      fill="#f8fafc"
                      stroke="#94a3b8"
                      stroke-width="1.5"
                    />
                    <circle
                      cx="-28"
                      cy="-14"
                      r="6"
                      fill="none"
                      stroke="#64748b"
                      stroke-width="1.5"
                    />
                    <circle cx="-28" cy="-14" r="2.5" fill="#64748b" />
                  }
                  @default {
                    <!-- TASK -->
                    <rect
                      x="-50"
                      y="-28"
                      width="100"
                      height="56"
                      rx="6"
                      fill="white"
                      stroke="#cbd5e1"
                      stroke-width="1.5"
                      [class.stroke-blue-500]="selectedNode?.id === node.id"
                    />
                  }
                }

                <!-- Etiqueta del nodo -->
                <text
                  text-anchor="middle"
                  [attr.y]="
                    ['START', 'END', 'TIMER', 'GATEWAY_XOR', 'GATEWAY_AND'].includes(node.type)
                      ? 32
                      : 8
                  "
                  fill="#334155"
                  font-size="10"
                  font-weight="600"
                  class="pointer-events-none"
                  style="font-family: ui-sans-serif, system-ui, sans-serif"
                >
                  {{ node.label }}
                </text>
                @if (
                  node.assignedRole &&
                  !['START', 'END', 'GATEWAY_XOR', 'GATEWAY_AND', 'TIMER'].includes(node.type)
                ) {
                  <text
                    text-anchor="middle"
                    y="22"
                    fill="#94a3b8"
                    font-size="8"
                    class="pointer-events-none uppercase tracking-wider"
                  >
                    {{ node.assignedRole }}
                  </text>
                }

                <!-- Puertos de conexión (aparecen al hacer hover) -->
                <!-- Puerto derecho: click para iniciar conexión -->
                <circle
                  cx="52"
                  cy="0"
                  r="5"
                  fill="white"
                  stroke="#3b82f6"
                  stroke-width="2"
                  class="opacity-0 hover:opacity-100 cursor-crosshair transition-opacity"
                  (mousedown)="startConnect($event, node)"
                  title="Conectar desde aquí"
                />
                <!-- Puerto izquierdo -->
                <circle
                  cx="-52"
                  cy="0"
                  r="5"
                  fill="white"
                  stroke="#3b82f6"
                  stroke-width="2"
                  class="opacity-0 hover:opacity-100 cursor-crosshair transition-opacity"
                  (mousedown)="startConnect($event, node)"
                  title="Conectar desde aquí"
                />
                <!-- Puerto inferior -->
                <circle
                  cx="0"
                  cy="30"
                  r="5"
                  fill="white"
                  stroke="#3b82f6"
                  stroke-width="2"
                  class="opacity-0 hover:opacity-100 cursor-crosshair transition-opacity"
                  (mousedown)="startConnect($event, node)"
                  title="Conectar desde aquí"
                />
              </g>
            }
          </svg>
        </div>

        <!-- Panel de Propiedades (REQ-04) -->
        <app-properties-panel
          [node]="selectedNode"
          [edge]="selectedEdge"
          [lanes]="workflow?.lanes || []"
          (nodeUpdated)="onNodeUpdated($event)"
          (edgeUpdated)="onEdgeUpdated($event)"
          (close)="selectedNode = null; selectedEdge = null"
        >
        </app-properties-panel>
      </div>

      <!-- Barra IA (REQ-09 + REQ-13) -->
      <app-ai-bar #aiBar (aiCommand)="onAICommand($event)"></app-ai-bar>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
    `,
  ],
})


export class DesignerComponent implements OnInit, OnDestroy {
  workflow: WorkflowDefinition | null = null;
  workflowId = '';
  selectedNode: WorkflowNode | null = null;
  selectedEdge: WorkflowEdge | null = null;
  connectedUsers: { id: string; name: string; color: string }[] = [];

  readonly mySessionId = 'u_' + Math.random().toString(36).substring(2, 8);

  activeUsers: { id: string; name: string; color: string }[] = [
    { id: this.mySessionId, name: 'Tú', color: '#10b981' },
  ];

  private readonly userColors = ['#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];
  
  activeNodeId: string | null = null;
  currentTramiteId: string | null = null;

  private nodeMoveRaw$ = new Subject<{ nodeId: string; x: number; y: number }>();
  laneWidth = 380;

  protected connectingFrom: { nodeId: string; x: number; y: number } | null = null;
  protected connectPreview: { x: number; y: number } | null = null;

  @ViewChild('aiBar') aiBar!: AiBarComponent;

  protected draggingNode: WorkflowNode | null = null;
  private offset = { x: 0, y: 0 };
  private socketSub: Subscription | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wfService = inject(WorkflowService);
  private socket = inject(WorkflowSocketService);
  private authService = inject(AuthService);
  readonly history = inject(HistoryService);
  private elevenLabs = inject(ElevenLabsService);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    this.route.params.subscribe((p) => {
      this.workflowId = p['id'];
      this.loadWorkflow();

      // Conectar socket
      this.socket.connect(this.workflowId);

      // 1. Suscribirse a actualizaciones
      this.socketSub = this.socket.getUpdates().subscribe((u) => this.handleRemote(u));

      // 2. Suscribirse a presencia
      this.socketSub.add(
        this.socket.getPresence().subscribe((presence: any) => {
          // Reconstruir lista: yo + colaboradores remotos
          const remoteCount = (presence.count || 1) - 1;
          this.activeUsers = [
            { id: this.mySessionId, name: 'Tú', color: '#10b981' },
            ...Array.from({ length: Math.max(0, remoteCount) }, (_, i) => ({
              id: `remote_${i}`,
              name: `Colaborador ${i + 1}`,
              color: this.userColors[i % this.userColors.length],
            })),
          ];
        })
      );

      // 3. Throttle para movimientos de nodos
      this.socketSub.add(
        this.nodeMoveRaw$.pipe(throttleTime(50)).subscribe((payload) => {
          const user = this.authService.getSession()();
          const name = user ? user.name : this.mySessionId;
          this.socket.sendNodeMove(this.workflowId, this.mySessionId, { ...payload, _name: name });
        })
      );
    });

    setTimeout(() => {
      this.elevenLabs.speak('Hola, soy tu asistente de iBPM. ¿En qué proceso te puedo ayudar hoy?');
    }, 1500);
  }

  ngOnDestroy() {
    this.socketSub?.unsubscribe();
    this.socket.disconnect();
  }

  logout() {
    this.router.navigate(['/login']);
  }

  // ── Cargar ─────────────────────────────────────────────────────────────────
  loadWorkflow() {
    this.wfService.getWorkflow(this.workflowId).subscribe((w) => {
      this.workflow = w;
      if (!this.workflow.lanes?.length) {
        this.workflow.lanes = [
          { id: 'lane-1', name: 'Solicitante', role: 'USUARIO_FINAL' },
          { id: 'lane-2', name: 'Secretaría', role: 'FUNCIONARIO' },
        ];
      }
      this.autoLayout();
      this.history.clear();
    });
  }

  autoLayout() {
    if (!this.workflow?.nodes) return;
    const count: Record<number, number> = {};
    this.workflow.nodes.forEach((n) => {
      if (!n.x || !n.y || (n.x < 5 && n.y < 5)) {
        const laneIdx = Math.max(
          0,
          this.workflow!.lanes.findIndex((l) => l.role === n.assignedRole),
        );
        count[laneIdx] = count[laneIdx] || 0;
        n.x = laneIdx * this.laneWidth + this.laneWidth / 2;
        n.y = 100 + count[laneIdx] * 140;
        count[laneIdx]++;
      }
    });
  }

  // ── Gestión ────────────────────────────────────────────────────────────────
  saveWorkflow() {
    if (!this.workflow) return;
    this.wfService.saveWorkflow(this.workflow).subscribe((w) => {
      this.workflow = w;
      alert('Workflow guardado ✓');
    });
  }

  launchProcess() {
    if (!this.workflow?.id) return;
    
    const startNode = this.workflow.nodes.find(n => n.type === 'START');
    if (!startNode) {
      alert('Error: El diagrama debe tener un nodo de inicio.');
      return;
    }

    const userId = 'user_demo_123';
    this.wfService.iniciarTramite(this.workflow.id, userId).subscribe({
      next: (tramite) => {
        this.currentTramiteId = tramite.id;
        this.activeNodeId = tramite.currentStepId || startNode.id;
        alert(`¡Proceso iniciado! ID: ${tramite.id}`);
      },
      error: () => alert('Error al iniciar el trámite.')
    });
  }

  addLane() {
    if (!this.workflow) return;
    this.pushHistory();
    const newId = 'lane-' + Date.now();
    this.workflow.lanes.push({
      id: newId,
      name: 'Nuevo Funcionario',
      role: 'NUEVO_FUNCIONARIO_' + Math.floor(Math.random() * 1000),
    });
  }

  // ── Mouse Events ───────────────────────────────────────────────────────────
  onDragOver(e: DragEvent) { e.preventDefault(); }

  onDrop(e: DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer?.getData('nodeType');
    if (!type || !this.workflow) return;

    const canvas = document.getElementById('workflow-canvas')!;
    const rect = canvas.getBoundingClientRect();
    let x = Math.round((e.clientX - rect.left) / 40) * 40;
    let y = Math.round((e.clientY - rect.top) / 40) * 40;

    const laneIdx = Math.floor(x / this.laneWidth);
    const role = this.workflow.lanes[laneIdx]?.role || '';

    this.pushHistory();
    const node: WorkflowNode = {
      id: 'node-' + Date.now(),
      label: this.defaultLabel(type),
      type, x, y, assignedRole: role,
    };
    this.workflow.nodes.push(node);
    this.broadcast('NODE_ADD', node);
  }

  onNodeMouseDown(e: MouseEvent, node: WorkflowNode) {
    e.stopPropagation();
    this.selectedNode = node;
    this.draggingNode = node;
    this.offset = { x: e.clientX - (node.x || 0), y: e.clientY - (node.y || 0) };
    this.pushHistory();
  }

  onCanvasMouseDown(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.selectedNode = null;
      this.selectedEdge = null;
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (this.draggingNode) {
      const x = Math.round((e.clientX - this.offset.x) / 20) * 20;
      const y = Math.round((e.clientY - this.offset.y) / 20) * 20;

      this.draggingNode.x = x;
      this.draggingNode.y = y;

      const laneIdx = Math.floor(x / this.laneWidth);
      if (this.workflow?.lanes[laneIdx]) {
        this.draggingNode.assignedRole = this.workflow.lanes[laneIdx].role;
      }
      this.nodeMoveRaw$.next({ nodeId: this.draggingNode.id, x, y });
    }
    
    if (this.connectingFrom) {
      const canvas = document.getElementById('workflow-canvas')!;
      const rect = canvas.getBoundingClientRect();
      this.connectPreview = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.draggingNode = null;
    this.connectingFrom = null;
    this.connectPreview = null;
  }

  startConnect(e: MouseEvent, sourceNode: WorkflowNode) {
    e.stopPropagation();
    const canvas = document.getElementById('workflow-canvas')!;
    const rect = canvas.getBoundingClientRect();
    this.connectingFrom = {
      nodeId: sourceNode.id,
      x: sourceNode.x || 0,
      y: sourceNode.y || 0,
    };
    this.connectPreview = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  finishConnect(targetNode: WorkflowNode) {
    if (!this.connectingFrom || !this.workflow) return;
    if (this.connectingFrom.nodeId === targetNode.id) return;

    const alreadyExists = this.workflow.edges.some(
      (e) => e.sourceId === this.connectingFrom!.nodeId && e.targetId === targetNode.id,
    );
    if (alreadyExists) return;

    this.pushHistory();
    const edge: WorkflowEdge = {
      id: 'edge-' + Date.now(),
      sourceId: this.connectingFrom.nodeId,
      targetId: targetNode.id,
    };
    this.workflow.edges.push(edge);
    this.broadcast('EDGE_ADD', edge);
    this.connectingFrom = null;
  }

  // ── Shortcuts & History ────────────────────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); this.undo(); }
      if (e.key === 'y') { e.preventDefault(); this.redo(); }
      if (e.key === 's') { e.preventDefault(); this.saveWorkflow(); }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedNode) this.deleteSelectedNode();
      else if (this.selectedEdge) this.deleteSelectedEdge();
    }
  }

  undo() {
    if (!this.workflow) return;
    const prev = this.history.undo(this.workflow);
    if (prev) this.workflow = prev;
  }

  redo() {
    if (!this.workflow) return;
    const next = this.history.redo(this.workflow);
    if (next) this.workflow = next;
  }

  private pushHistory() {
    if (this.workflow) this.history.push(this.workflow);
  }

  // ── Lanes ──────────────────────────────────────────────────────────────────
  renameLane(lane: WorkflowLane) {
    const name = prompt('Nuevo nombre del carril:', lane.name);
    if (name && name.trim()) {
      this.pushHistory();
      const oldRole = lane.role;
      lane.name = name.trim();
      let newRole = lane.name.trim().toUpperCase().normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_');
      lane.role = newRole || 'ROLE_' + Date.now();

      if (this.workflow) {
        this.workflow.nodes.forEach(n => {
          if (n.assignedRole === oldRole) n.assignedRole = lane.role;
        });
      }
    }
  }

  deleteLane(lane: WorkflowLane) {
    if (!this.workflow) return;
    if (!confirm(`¿Eliminar el carril "${lane.name}"?`)) return;
    this.pushHistory();
    this.workflow.lanes = this.workflow.lanes.filter((l) => l.id !== lane.id);
  }

  deleteSelectedNode() {
    if (!this.workflow || !this.selectedNode) return;
    this.pushHistory();
    const id = this.selectedNode.id;
    this.workflow.nodes = this.workflow.nodes.filter((n) => n.id !== id);
    this.workflow.edges = this.workflow.edges.filter((e) => e.sourceId !== id && e.targetId !== id);
    this.selectedNode = null;
  }

  selectEdge(edge: WorkflowEdge) {
    this.selectedEdge = this.selectedEdge?.id === edge.id ? null : edge;
    this.selectedNode = null;
  }

  deleteSelectedEdge() {
    if (!this.workflow || !this.selectedEdge) return;
    this.pushHistory();
    this.workflow.edges = this.workflow.edges.filter((e) => e.id !== this.selectedEdge!.id);
    this.selectedEdge = null;
  }

  onNodeUpdated(node: WorkflowNode) {
    if (!this.workflow) return;
    const idx = this.workflow.nodes.findIndex((n) => n.id === node.id);
    if (idx >= 0) this.workflow.nodes[idx] = { ...node };
    this.broadcast('NODE_ADD', node);
  }

  onEdgeUpdated(edge: WorkflowEdge) {
    if (!this.workflow) return;
    const idx = this.workflow.edges.findIndex((e) => e.id === edge.id);
    if (idx >= 0) this.workflow.edges[idx] = { ...edge };
  }

  // ── IA ─────────────────────────────────────────────────────────────────────
  onAICommand(prompt: string) {
    this.wfService.generateFromAI(prompt).subscribe({
      next: (result: any) => {
        if (this.workflow && result?.nodes) {
          this.pushHistory();
          this.workflow.nodes = result.nodes;
          this.workflow.edges = result.edges || [];
          this.autoLayoutAI();
          this.elevenLabs.speak('He generado el diagrama para ' + prompt);
        }
        this.aiBar?.setThinking(false);
      },
      error: () => {
        this.aiBar?.setThinking(false);
        this.elevenLabs.speak('Lo siento, hubo un problema.');
      }
    });
  }

  private autoLayoutAI() {
    if (!this.workflow || this.workflow.nodes.length === 0) return;
    const startNode = this.workflow.nodes.find((n) => n.type === 'START');
    if (!startNode) return;

    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: startNode.id, depth: 0 }];
    const nodeDepths = new Map<string, number>();

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      nodeDepths.set(id, depth);
      this.workflow.edges.filter(e => e.sourceId === id).forEach(e => {
        queue.push({ id: e.targetId, depth: depth + 1 });
      });
    }

    const depthCounts = new Map<number, number>();
    this.workflow.nodes.forEach((node) => {
      const depth = nodeDepths.get(node.id) || 0;
      const count = depthCounts.get(depth) || 0;
      node.x = 100 + depth * 250;
      node.y = 150 + count * 120;
      depthCounts.set(depth, count + 1);
    });
  }

  // ── Conectores & Coordenadas ───────────────────────────────────────────────
  getPath(edge: WorkflowEdge): string {
    const s = this.coords(edge.sourceId);
    const t = this.coords(edge.targetId);
    
    const targetNode = this.workflow?.nodes.find(n => n.id === edge.targetId);
    const isSmall = ['START', 'END', 'TIMER', 'GATEWAY_XOR', 'GATEWAY_AND'].includes(targetNode?.type || '');
    const radiusX = isSmall ? 22 : 50;
    const radiusY = isSmall ? 22 : 28;
    
    let tx = t.x;
    let ty = t.y;
    
    if (Math.abs(t.x - s.x) > 20) {
      tx = (t.x > s.x) ? t.x - radiusX - 4 : t.x + radiusX + 4;
    } else {
      ty = (t.y > s.y) ? t.y - radiusY - 4 : t.y + radiusY + 4;
    }

    const mx = (s.x + tx) / 2;
    return `M${s.x} ${s.y} C${mx} ${s.y} ${mx} ${ty} ${tx} ${ty}`;
  }

  getEdgeMidX(edge: WorkflowEdge): number {
    const s = this.coords(edge.sourceId);
    const t = this.coords(edge.targetId);
    return (s.x + t.x) / 2;
  }

  getEdgeMidY(edge: WorkflowEdge): number {
    const s = this.coords(edge.sourceId);
    const t = this.coords(edge.targetId);
    return (s.y + t.y) / 2;
  }

  coords(id: string) {
    const n = this.workflow?.nodes.find((n) => n.id === id);
    return { x: n?.x || 0, y: n?.y || 0 };
  }

  // ── WebSocket ──────────────────────────────────────────────────────────────
  private broadcast(type: 'NODE_ADD' | 'NODE_DELETE' | 'EDGE_ADD' | 'EDGE_DELETE', payload: any) {
    this.socket.sendUpdate(this.workflowId, { userId: this.mySessionId, type, payload });
  }

  private handleRemote(u: WorkflowUpdate) {
    if (!this.workflow || u.userId === this.mySessionId) return;

    if (u.type === 'NODE_MOVE') {
      const n = this.workflow.nodes.find((node) => node.id === u.payload.nodeId);
      if (n && n !== this.draggingNode) {
        n.x = u.payload.x;
        n.y = u.payload.y;
      }
    }
  }

  private defaultLabel(type: string): string {
    const m: Record<string, string> = {
      START: 'Inicio', END: 'Fin', TASK: 'Tarea', SERVICE: 'Servicio',
      GATEWAY_XOR: 'Decisión', GATEWAY_AND: 'Paralelo', AGENT: 'Agente IA',
      TIMER: 'Temporizador', MAIL: 'Correo',
    };
    return m[type] || 'Nodo';
  }
}