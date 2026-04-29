import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject, Observable, throttleTime } from 'rxjs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/** Mensaje de movimiento de nodo (solo coordenadas, nunca BD) */
export interface NodeMovePayload {
  nodeId: string;
  x: number;
  y: number;
  _name?: string;
}

/** Estructura genérica de mensajes del tópico de workflow */
export interface WorkflowUpdate {
  userId: string;
  type: 'NODE_MOVE' | 'NODE_ADD' | 'NODE_DELETE' | 'EDGE_ADD' | 'EDGE_DELETE' | 'METADATA_UPDATE';
  payload: any;
}

/** Mensaje del tópico de presencia */
export interface PresenceUpdate {
  count: number;
  sessions: string[];
}

@Injectable({ providedIn: 'root' })
export class WorkflowSocketService implements OnDestroy {

  private stompClient: Client | null = null;

  // --- Subjects internos ---
  private updatesSubject  = new Subject<WorkflowUpdate>();
  private presenceSubject = new Subject<PresenceUpdate>();

  constructor(private zone: NgZone) {}

  // ── Conexión ──────────────────────────────────────────────────────────────

  connect(workflowId: string): void {
    // Si ya hay una conexión activa, la reutilizamos
    if (this.stompClient?.connected) return;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-workflow'),
      // En producción, eliminar o reducir el debug:
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = () => {
      console.log('[Socket] Conectado al workflow', workflowId);

      // Canal de actualizaciones del diagrama
      this.stompClient!.subscribe(`/topic/workflow/${workflowId}`, (msg) => {
        this.zone.run(() => this.updatesSubject.next(JSON.parse(msg.body)));
      });

      // Canal de presencia global
      this.stompClient!.subscribe('/topic/presence', (msg) => {
        this.zone.run(() => this.presenceSubject.next(JSON.parse(msg.body)));
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('[Socket] STOMP Error:', frame.headers['message']);
    };

    this.stompClient.activate();
  }

  // ── Envío de movimiento (solo {id,x,y} — NO toca la BD) ──────────────────

  /**
   * Emite las coordenadas de un nodo durante el arrastre.
   * El componente aplica throttleTime ANTES de llamar a este método.
   */
  sendNodeMove(workflowId: string, userId: string, payload: NodeMovePayload): void {
    if (!this.stompClient?.connected) return;
    this.stompClient.publish({
      destination: `/app/workflow/${workflowId}/update`,
      body: JSON.stringify({ userId, type: 'NODE_MOVE', payload })
    });
  }

  /** Envía cualquier otro tipo de actualización (ADD, DELETE, etc.) */
  sendUpdate(workflowId: string, update: WorkflowUpdate): void {
    if (!this.stompClient?.connected) return;
    this.stompClient.publish({
      destination: `/app/workflow/${workflowId}/update`,
      body: JSON.stringify(update)
    });
  }

  // ── Observables públicos ──────────────────────────────────────────────────

  /** Actualizaciones del diagrama (NODE_MOVE, NODE_ADD, etc.) */
  getUpdates(): Observable<WorkflowUpdate> {
    return this.updatesSubject.asObservable();
  }

  /** Conteo de usuarios conectados desde el backend */
  getPresence(): Observable<PresenceUpdate> {
    return this.presenceSubject.asObservable();
  }

  // ── Desconexión ───────────────────────────────────────────────────────────

  disconnect(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
