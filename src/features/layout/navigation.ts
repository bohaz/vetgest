import type { IconName } from '@/shared/icons'

export interface NavItem { to: string; label: string; icon: IconName; end?: boolean }

/** Secciones de la app, en el orden del menú lateral. */
export const NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/pacientes', label: 'Pacientes', icon: 'paw' },
  { to: '/clientes', label: 'Clientes', icon: 'users' },
  { to: '/agenda', label: 'Agenda', icon: 'calendar' },
  { to: '/ventas', label: 'Ventas', icon: 'cart' },
  { to: '/inventario', label: 'Inventario', icon: 'box' },
]

/** En celular: las cuatro de uso diario y «Más» para el resto. */
export const MOBILE_NAV: NavItem[] = [
  NAV[0], NAV[1], NAV[3], NAV[4],
  { to: '/mas', label: 'Más', icon: 'more' },
]
const IN_MORE = ['/clientes', '/inventario', '/mas']

/** Ítem activo de la barra inferior para una ruta (Clientes e Inventario cuentan como «Más»). */
export function activeMobileItem(pathname: string): string {
  if (IN_MORE.some(p => pathname === p || pathname.startsWith(`${p}/`))) return '/mas'
  const match = MOBILE_NAV.find(n => n.to !== '/' && (pathname === n.to || pathname.startsWith(`${n.to}/`)))
  return match?.to ?? '/'
}

/** Nombre de la pantalla actual, para el mensaje de comentarios. */
export function screenName(pathname: string): string {
  if (pathname === '/') return 'Inicio'
  if (pathname === '/mas') return 'Más'
  return NAV.find(n => n.to !== '/' && pathname.startsWith(n.to))?.label ?? 'VetGest'
}
