import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserRole } from '../services/auth.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4">
      <!-- Background Decorations -->
      <div class="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden">
        <div class="absolute top-[10%] right-[15%] w-64 h-64 bg-brand-primary/20 rounded-full blur-[100px] animate-pulse"></div>
        <div class="absolute bottom-[20%] left-[10%] w-80 h-80 bg-brand-secondary/20 rounded-full blur-[120px] animate-pulse" style="animation-delay: 2s"></div>
      </div>

      <div class="w-full max-w-md animate-fade-in">
        <div class="glass-card shadow-2xl">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-2">
              iBPM Central
            </h1>
            <p class="text-white/50">Gestión Inteligente de Procesos de Negocio</p>
          </div>

          <div class="space-y-4">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
              Seleccionar Perfil de Acceso
            </h2>

            <button (click)="onLogin('DISEÑADOR_POLITICAS')" class="w-full group relative overflow-hidden p-4 rounded-xl border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-brand-primary/50 text-left">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <i-lucide name="layout-template"></i-lucide>
                </div>
                <div>
                  <div class="font-semibold">Diseñador de Políticas</div>
                  <div class="text-xs text-white/40">Modelado y Analítica de Grafos</div>
                </div>
              </div>
            </button>

            <button (click)="onLogin('USUARIO_FINAL')" class="w-full group relative overflow-hidden p-4 rounded-xl border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-brand-secondary/50 text-left">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-lg bg-brand-secondary/20 flex items-center justify-center text-brand-secondary">
                  <i-lucide name="user"></i-lucide>
                </div>
                <div>
                  <div class="font-semibold">Usuario Final</div>
                  <div class="text-xs text-white/40">Seguimiento de Trámites</div>
                </div>
              </div>
            </button>

            <div class="mt-4 p-4 rounded-xl border border-white/10 bg-white/5 transition-all focus-within:border-brand-accent/50">
              <div class="flex items-center gap-4 mb-3">
                <div class="w-10 h-10 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                  <i-lucide name="clipboard-check"></i-lucide>
                </div>
                <div>
                  <div class="font-semibold">Rol Personalizado</div>
                  <div class="text-xs text-white/40">Ingresa como funcionario específico</div>
                </div>
              </div>
              <div class="flex gap-2">
                <input type="text" [(ngModel)]="customRole" placeholder="Ej: INSPECTOR_TECINICO" 
                       (keyup.enter)="onCustomLogin()"
                       class="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent/50 uppercase">
                <button (click)="onCustomLogin()" [disabled]="!customRole" 
                        class="bg-brand-accent/20 text-brand-accent px-4 py-2 rounded-lg font-bold hover:bg-brand-accent/30 disabled:opacity-50 transition-all">
                  Ingresar
                </button>
              </div>
            </div>
          </div>

          <div class="mt-8 pt-6 border-t border-white/10 text-center">
            <p class="text-xs text-white/30 flex items-center justify-center gap-2">
              <i-lucide name="shield-check" [size]="14"></i-lucide>
              Plataforma Institucional Segura
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent {
  customRole = '';

  constructor(private authService: AuthService) {}

  onLogin(role: any) {
    this.authService.login(role);
  }

  onCustomLogin() {
    if (this.customRole) {
      this.authService.login(this.customRole.toUpperCase() as any);
    }
  }
}
