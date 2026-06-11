import { Component, OnInit, ViewChild, ElementRef, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';

@Component({
  selector: 'app-collaborative-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="h-full flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#1e1e2e]"
    >
      <!-- Encabezado Oscuro -->
      <div class="bg-slate-900 text-white p-3 flex items-center justify-between z-10">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <span class="text-sm font-semibold text-slate-200">
            Editores activos en simultáneo:
            <span class="text-amber-400">{{ editoresActivos }}</span>
          </span>
        </div>
        <button
          (click)="consolidarYSubir()"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm"
        >
          Consolidar y subir versión a S3
        </button>
      </div>

      <!-- Contenedor del Editor Quill -->
      <div class="flex-1 relative bg-white">
        <!-- Editor Quill será inicializado aquí -->
        <div #editorContainer class="absolute inset-0 h-full border-none"></div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 400px;
      }
      /* Ajustes para sobreescribir estilos por defecto de Quill dentro del contenedor */
      ::ng-deep .ql-container {
        font-family: 'Inter', sans-serif !important;
        font-size: 14px !important;
      }
      ::ng-deep .ql-toolbar {
        background: #f8f9fa;
        border: none !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
    `,
  ],
})
export class CollaborativeEditorComponent implements OnInit {
  @Input() documentId: string = 'doc-test';
  @Input() initialFile?: File; // Archivo Word (opcional) a cargar inicialmente

  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  private http = inject(HttpClient);
  private quill!: Quill;
  private ydoc!: Y.Doc;
  private provider!: WebsocketProvider;
  private binding!: QuillBinding;
  editoresActivos: string = 'Cargando...';

  ngOnInit() {
    // 1. Instanciar Quill
    this.quill = new Quill(this.editorContainer.nativeElement, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['clean'],
        ],
      },
    });

    // 2. Crear documento compartido Yjs
    this.ydoc = new Y.Doc();
    const ytext = this.ydoc.getText('quill');

    // 3. Configurar WebsocketProvider
    const roomName = `ibpm-central-room-${this.documentId}`;
    
    // Usamos el servidor local de Yjs
    // this.provider = new WebsocketProvider('wss://demos.yjs.dev', roomName, this.ydoc);
    this.provider = new WebsocketProvider('ws://localhost:1234/', roomName, this.ydoc);

    // 4. Vincular Quill con Yjs
    this.binding = new QuillBinding(ytext, this.quill, this.provider.awareness);
    const usuarioActual = localStorage.getItem('username') || 'Funcionario';
    this.provider.awareness.setLocalStateField('user', { name: usuarioActual });
    // 5. Cargar archivo Word a HTML vía Backend si se proporcionó y la sala está vacía
    if (this.initialFile) {
      this.provider.on('sync', (isSynced: boolean) => {
        if (isSynced && ytext.length === 0) {
          // Si es el primer usuario y el documento está vacío, extraemos el HTML
          this.extraerHtmlDesdeWord(this.initialFile!);
        }
      });
    }

    // 🚨 CONFIGURACIÓN DE PRESENCIA REAL (AWARENESS) DE EXTREMO A EXTREMO:

    // A) Extraemos el usuario que inició sesión real en tu sistema
    this.provider.on('status', (event: any) => {
      if (event.status === 'connected') {
        // A) Extraer el usuario de la sesión de manera segura
        const sessionData =
          sessionStorage.getItem('user_session') || localStorage.getItem('user_session');
        let nombreFormateado = 'Funcionario';

        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            nombreFormateado = parsed.name || parsed.username || 'Funcionario';
          } catch (e) {
            nombreFormateado = 'Funcionario';
          }
        }

        // B) Registrar el estado local de presencia sin disparar rebotes de renderizado
        setTimeout(() => {
          this.provider.awareness.setLocalStateField('user', { name: nombreFormateado });
        }, 100);
      }
    });

    // C) Escuchar los cambios de presencia de forma global
    this.provider.awareness.on('change', () => {
      const states = Array.from(this.provider.awareness.getStates().values());
      const nombres = states.map((state: any) => state.user?.name).filter((name) => !!name);

      // Evitamos duplicados visuales en la misma pantalla usando un Set
      const nombresUnicos = [...new Set(nombres)];

      // Actualiza la variable de tu HTML de forma limpia
      this.editoresActivos = `${nombresUnicos.join(', ')} (${nombresUnicos.length}/3)`;
    });
  } // ◄ Cierre

  private extraerHtmlDesdeWord(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    this.http
      .post<{
        success: boolean;
        html?: string;
        message?: string;
      }>(`${environment.coreUrl}/documents/to-html`, formData)
      .subscribe({
        next: (res) => {
          if (res.success && res.html) {
            // Inyectar de forma segura en Quill (solo lo hará el usuario que inicializa la sala)
            this.quill.clipboard.dangerouslyPasteHTML(res.html);
          } else {
            console.error('Error del backend al procesar Word: - collaborative-editor.component.ts:168', res.message);
          }
        },
        error: (err) => console.error('Fallo HTTP al procesar archivo Word - collaborative-editor.component.ts:171', err),
      });
  }

  consolidarYSubir() {
    // Aquí podrías obtener el HTML consolidado y enviarlo a tu StorageService S3
    const finalHtml = this.quill.root.innerHTML;
    alert(
      'Versión consolidada capturada correctamente. Bytes listos para el PUT a S3.\\n\\nLongitud: ' +
        finalHtml.length +
        ' caracteres.',
    );
  }
}
