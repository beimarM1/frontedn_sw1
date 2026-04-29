import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export type UserRole = 'DISEÑADOR_POLITICAS' | 'FUNCIONARIO' | 'USUARIO_FINAL' | 'AGENTE_IA';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private session = signal<UserSession | null>(null);

  constructor(private router: Router) {
    // Restaurar sesión si existe en localStorage
    const saved = localStorage.getItem('btp_session');
    if (saved) {
      this.session.set(JSON.parse(saved));
    }
  }

  getSession() {
    return this.session.asReadonly();
  }

  isLoggedIn() {
    return this.session() !== null;
  }

  login(role: UserRole) {
    // Simulación de login exitoso
    const mockUser: UserSession = {
      id: 'usr-' + Math.random().toString(36).substr(2, 9),
      name: this.formatName(role),
      role: role,
      email: `${role.toLowerCase()}@uagrm.edu.bo`
    };

    this.session.set(mockUser);
    localStorage.setItem('btp_session', JSON.stringify(mockUser));
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.session.set(null);
    localStorage.removeItem('btp_session');
    this.router.navigate(['/login']);
  }

  private formatName(role: string): string {
    return role.split('_')
      .map(part => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }
}
