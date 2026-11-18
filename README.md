# cLoak Studios · Gestor de clientes

App privada para gestionar proyectos, servicios y notas de **cLoak Studios**.
SPA en React + Vite + TypeScript + Tailwind, alojada en GitHub Pages, con datos y login en **Supabase**.

Pantallas: Login · Dashboard (KPIs y aviso de almacenamiento) · Proyectos · Servicios · Notas · Documentación.

Los ficheros adjuntos (proyectos y secciones de Documentación) se guardan en **Supabase Storage** (bucket privado `attachments`); en la base de datos solo van sus metadatos (tabla `attachments`).

## 1. Configurar Supabase (una sola vez)

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. **SQL Editor** → pega y ejecuta [`supabase/schema.sql`](supabase/schema.sql). Crea las tablas y las políticas RLS (cada usuario solo ve sus datos).
   - Si ya tenías la base de datos creada, ejecuta además los scripts de [`supabase/migrations/`](supabase/migrations) que aún no hayas aplicado (por ejemplo `003_project_extras.sql`: contacto, condiciones contractuales, Documentación, adjuntos y bucket de Storage con sus políticas).
3. **Authentication → Sign In / Providers** → desactiva *Allow new users to sign up* (nadie más podrá registrarse).
4. **Authentication → Users → Add user** → crea tu usuario (email + contraseña). Esas son tus credenciales de acceso.
5. **Project Settings → API** → copia la *Project URL* y la *anon public key*.

> La anon key es pública por diseño: va dentro del JavaScript. La seguridad la dan el login y las políticas RLS. Nunca uses la `service_role` key en esta app.

## 2. Desarrollo local

Crea un archivo `.env` en la raíz con:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Variables opcionales:

```
VITE_MAX_FILE_MB=20         # tamaño máximo por fichero (el bucket limita a 20 MB)
VITE_STORAGE_QUOTA_MB=1024  # cuota de almacenamiento; el Dashboard avisa al superar el 80 %
```

```bash
npm install
npm run dev
npm test        # pruebas de la lógica (hitos de pago, validación de ficheros)
```

## 3. Despliegue en GitHub Pages

1. **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. **Settings → Pages → Source: GitHub Actions**.
3. Push a `main` → el workflow [`deploy.yml`](.github/workflows/deploy.yml) compila y publica en
   `https://<usuario>.github.io/cLoakStudiosApp/`.
4. En Supabase → **Authentication → URL Configuration**, añade esa URL como *Site URL*.

Si cambias el nombre del repo, actualiza `base` en `vite.config.ts` y las rutas de los iconos en `index.html`.

## Marca

Tokens en `src/styles/tokens.css` (paleta, tipografías y radios del brand guide).
Logo: generado a partir de `cLoak Studios/layout/logo.jpeg` → `public/logo-mark.png` (sidebar/login, sin fondo), `favicon-32/64.png` y `apple-touch-icon.png` (icono de pantalla de inicio).

### App móvil (PWA)

La app se puede instalar en el móvil: pulsa en tu sesión (abajo en el menú) y sigue los pasos. Archivos: `public/manifest.webmanifest`, `public/sw.js` (solo cachea la interfaz; los datos de Supabase siempre van a la red) e iconos `public/icon-192.png`, `icon-512.png` e `icon-maskable-512.png`. El service worker solo se registra en producción. Si cambias `sw.js`, sube la versión de `CACHE` para que los móviles descarguen la nueva.
