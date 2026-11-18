import {
  Bot, CalendarDays, Camera, ChartColumn, Cloud, Code, Database, FileText, Globe, Headset, Languages,
  LayoutTemplate, Link, Mail, Megaphone, MonitorSmartphone, Nfc, Palette, PenTool, Printer, QrCode,
  SearchCheck, Server, Share2, ShieldCheck, ShoppingCart, Smartphone, Sparkles, Store, Tag, Video, Wrench,
  type LucideIcon,
} from 'lucide-react'

/** Iconos disponibles para los servicios. La clave es lo que se guarda en services.icon. */
export const SERVICE_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  web: { icon: Globe, label: 'Página web' },
  landing: { icon: LayoutTemplate, label: 'Landing page' },
  app: { icon: Smartphone, label: 'Aplicación móvil' },
  multiplatform: { icon: MonitorSmartphone, label: 'App multiplataforma' },
  qr: { icon: QrCode, label: 'Código QR' },
  nfc: { icon: Nfc, label: 'NFC' },
  link: { icon: Link, label: 'Enlaces / link in bio' },
  ecommerce: { icon: ShoppingCart, label: 'Tienda online' },
  store: { icon: Store, label: 'Negocio local' },
  design: { icon: Palette, label: 'Diseño / branding' },
  logo: { icon: PenTool, label: 'Logotipo' },
  print: { icon: Printer, label: 'Imprenta' },
  seo: { icon: SearchCheck, label: 'SEO' },
  marketing: { icon: Megaphone, label: 'Marketing' },
  social: { icon: Share2, label: 'Redes sociales' },
  email: { icon: Mail, label: 'Email' },
  photo: { icon: Camera, label: 'Fotografía' },
  video: { icon: Video, label: 'Vídeo' },
  analytics: { icon: ChartColumn, label: 'Analítica' },
  ai: { icon: Bot, label: 'IA / chatbot' },
  automation: { icon: Sparkles, label: 'Automatización' },
  booking: { icon: CalendarDays, label: 'Reservas / citas' },
  dev: { icon: Code, label: 'Desarrollo a medida' },
  database: { icon: Database, label: 'Base de datos' },
  hosting: { icon: Server, label: 'Hosting / dominio' },
  cloud: { icon: Cloud, label: 'Cloud' },
  security: { icon: ShieldCheck, label: 'Seguridad' },
  maintenance: { icon: Wrench, label: 'Mantenimiento' },
  support: { icon: Headset, label: 'Soporte' },
  translation: { icon: Languages, label: 'Traducción' },
  content: { icon: FileText, label: 'Contenidos' },
  other: { icon: Tag, label: 'Otro' },
}

export const DEFAULT_SERVICE_ICON = 'other'

export function ServiceIcon({ name, size = 14, className = '' }: { name?: string | null; size?: number; className?: string }) {
  const Icon = (name && SERVICE_ICONS[name]?.icon) || Tag
  return <Icon size={size} className={`shrink-0 ${className}`} aria-hidden />
}
