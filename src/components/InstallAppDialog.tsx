import { useEffect, useState, type ReactNode } from 'react'
import { Check, CircleCheck, Copy, Download, EllipsisVertical, Share, SquarePlus } from 'lucide-react'
import { Modal } from './Modal'
import { canPromptInstall, detectPlatform, isStandalone, promptInstall, subscribeInstall } from '../lib/pwa'

/** Dirección pública de la app (GitHub Pages). En local se usa esta para abrirla desde el móvil. */
const PUBLIC_URL = 'https://javiercillo11.github.io/cLoakStudiosApp/'

function appUrl() {
  const { hostname, origin } = window.location
  const local = hostname === 'localhost' || hostname === '127.0.0.1'
  return local ? PUBLIC_URL : origin + import.meta.env.BASE_URL
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet/20 font-mono text-xs text-violet-soft">{n}</span>
      <span className="pt-0.5 text-sm leading-relaxed text-ghost/90">{children}</span>
    </li>
  )
}

const Kbd = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 align-middle text-xs font-medium text-ghost">{children}</span>
)

export function InstallAppDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [canPrompt, setCanPrompt] = useState(canPromptInstall)
  const [copied, setCopied] = useState(false)
  const [installed, setInstalled] = useState(false)
  const platform = detectPlatform()
  const standalone = isStandalone()
  const url = appUrl()

  useEffect(() => subscribeInstall(() => setCanPrompt(canPromptInstall())), [])
  useEffect(() => { if (!open) setCopied(false) }, [open])

  const install = async () => {
    if (await promptInstall()) setInstalled(true)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      /* el portapapeles puede estar bloqueado; el enlace sigue visible */
    }
  }

  return (
    <Modal open={open} title="Instalar la app" onClose={onClose}>
      <div className="mb-5 flex items-center gap-4">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={64} height={64}
          className="h-16 w-16 shrink-0 rounded-[22%] shadow-lg shadow-black/40" />
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold">cLoak Studios App</p>
          <p className="text-sm text-muted">Ábrela desde la pantalla de inicio, a pantalla completa y sin barra del navegador.</p>
        </div>
      </div>

      {standalone || installed ? (
        <p className="flex items-center gap-2 rounded-control bg-success/10 px-3 py-3 text-sm text-success">
          <CircleCheck size={18} /> {installed ? 'App instalada. Ya la tienes en tu pantalla de inicio.' : 'Ya estás usando la app instalada.'}
        </p>
      ) : (
        <>
          {canPrompt && (
            <button onClick={install} className="btn-primary mb-5 w-full">
              <Download size={16} /> Instalar app
            </button>
          )}

          {platform === 'ios' && (
            <>
              <p className="eyebrow mb-3">En iPhone / iPad</p>
              <ol className="flex flex-col gap-3">
                <Step n={1}>Abre esta página en <strong className="font-medium text-ghost">Safari</strong>.</Step>
                <Step n={2}>Pulsa <Kbd><Share size={13} /> Compartir</Kbd> en la barra inferior.</Step>
                <Step n={3}>Elige <Kbd><SquarePlus size={13} /> Añadir a pantalla de inicio</Kbd>.</Step>
                <Step n={4}>Pulsa <Kbd>Añadir</Kbd>. El icono de cLoak aparecerá con tus apps.</Step>
              </ol>
            </>
          )}

          {platform === 'android' && !canPrompt && (
            <>
              <p className="eyebrow mb-3">En Android</p>
              <ol className="flex flex-col gap-3">
                <Step n={1}>Abre esta página en <strong className="font-medium text-ghost">Chrome</strong>.</Step>
                <Step n={2}>Pulsa el menú <Kbd><EllipsisVertical size={13} /></Kbd> arriba a la derecha.</Step>
                <Step n={3}>Elige <Kbd>Instalar aplicación</Kbd> o <Kbd>Añadir a pantalla de inicio</Kbd>.</Step>
              </ol>
            </>
          )}

          {platform === 'desktop' && (
            <>
              <p className="eyebrow mb-3">En tu móvil</p>
              <ol className="mb-4 flex flex-col gap-3">
                <Step n={1}>Abre esta dirección en el navegador del móvil:</Step>
              </ol>
              <div className="mb-4 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-control border border-white/10 bg-obsidian px-3 py-2.5 font-mono text-xs text-ghost sm:py-2">
                  {url}
                </code>
                <button onClick={copy} className="btn-ghost shrink-0 border border-white/10" aria-live="polite">
                  {copied ? <><Check size={15} className="text-success" /> Copiado</> : <><Copy size={15} /> Copiar</>}
                </button>
              </div>
              <ol start={2} className="flex flex-col gap-3">
                <Step n={2}>Inicia sesión y vuelve a pulsar en tu sesión, abajo en el menú.</Step>
                <Step n={3}>Sigue los pasos que aparecerán para iPhone o Android.</Step>
              </ol>
              {canPrompt && (
                <p className="mt-4 text-xs text-muted">También puedes instalarla en este ordenador con el botón de arriba.</p>
              )}
            </>
          )}
        </>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={onClose} className="btn-ghost flex-1 sm:flex-none">Cerrar</button>
      </div>
    </Modal>
  )
}
