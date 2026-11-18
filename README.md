# cLoak Studios · Gestor de clientes

App privada para gestionar proyectos, servicios y notas de **cLoak Studios**.
SPA en React + Vite + TypeScript + Tailwind, alojada en GitHub Pages, con datos y login en **Supabase**.

Pantallas: Login · Dashboard (KPIs) · Proyectos · Servicios · Notas.

## 1. Configurar Supabase (una sola vez)

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. **SQL Editor** → pega y ejecuta [`supabase/schema.sql`](supabase/schema.sql). Crea las tablas y las políticas RLS (cada usuario solo ve sus datos).
3. **Authentication → Sign In / Providers** → desactiva *Allow new users to sign up* (nadie más podrá registrarse).
4. **Authentication → Users → Add user** → crea tu usuario (email + contraseña). Esas son tus credenciales de acceso.
5. **Project Settings → API** → copia la *Project URL* y la *anon public key*.

> La anon key es pública por diseño: va dentro del JavaScript. La seguridad la dan el login y las políticas RLS. Nunca uses la `service_role` key en esta app.

## 2. Desarrollo local

```bash
cp .env.example .env.local   # rellena URL y anon key
npm install
npm run dev
```

## 3. Despliegue en GitHub Pages

1. **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. **Settings → Pages → Source: GitHub Actions**.
3. Push a `main` → el workflow [`deploy.yml`](.github/workflows/deploy.yml) compila y publica en
   `https://<usuario>.github.io/cLoakStudiosApp/`.
4. En Supabase → **Authentication → URL Configuration**, añade esa URL como *Site URL*.

Si cambias el nombre del repo, actualiza `base` en `vite.config.ts` y la ruta del favicon en `index.html`.

## Marca

Tokens en `src/styles/tokens.css` (paleta, tipografías y radios del brand guide).
Logo: SVG original en `src/components/brand/` y `public/` (favicon + variantes monocromas).
