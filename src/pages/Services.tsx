import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import type { Service } from '../lib/types'
import { formatEUR } from '../lib/format'
import { DEFAULT_SERVICE_ICON, ServiceIcon } from '../lib/serviceIcons'
import { IconPicker } from '../components/IconPicker'
import { PageHeader } from '../components/PageHeader'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StateMessage } from '../components/StateMessage'

type Draft = { name: string; description: string; price: string; icon: string }
const EMPTY: Draft = { name: '', description: '', price: '', icon: DEFAULT_SERVICE_ICON }

export function Services() {
  const { rows, loading, error, insert, update, remove } = useTable<Service>('services')
  const [editing, setEditing] = useState<Service | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [toDelete, setToDelete] = useState<Service | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const openNew = () => { setEditing(null); setDraft(EMPTY); setFormError(null); setOpen(true) }
  const openEdit = (s: Service) => {
    setEditing(s)
    setDraft({ name: s.name, description: s.description, price: String(s.price), icon: s.icon || DEFAULT_SERVICE_ICON })
    setFormError(null)
    setOpen(true)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const price = Number(draft.price.replace(',', '.'))
    if (!draft.name.trim()) return setFormError('El nombre es obligatorio.')
    if (Number.isNaN(price) || price < 0) return setFormError('El precio debe ser un número positivo.')
    setSaving(true)
    try {
      const values = { name: draft.name.trim(), description: draft.description.trim(), price, icon: draft.icon }
      if (editing) await update(editing.id, values)
      else await insert(values)
      setOpen(false)
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Catálogo" title="Servicios"
        action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo servicio</button>} />

      {error ? (
        <StateMessage title="No se pudieron cargar los servicios" tone="error">{error}</StateMessage>
      ) : loading ? (
        <StateMessage title="Cargando…" />
      ) : rows.length === 0 ? (
        <StateMessage title="Aún no hay servicios">Añade el primero para poder asignarlo a tus proyectos.</StateMessage>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((s) => (
            <article key={s.id} className="card group flex flex-col p-4 sm:p-5 transition-colors hover:border-violet/30">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-violet/15 text-violet-soft">
                    <ServiceIcon name={s.icon} size={20} />
                  </span>
                  <h2 className="min-w-0 break-words text-lg font-semibold">{s.name}</h2>
                </div>
                <span className="shrink-0 font-mono text-sm text-violet-soft">{formatEUR(Number(s.price))}</span>
              </div>
              <p className="flex-1 whitespace-pre-line text-sm text-muted [overflow-wrap:anywhere]">{s.description || '—'}</p>
              <div className="mt-4 flex justify-end gap-1 border-t border-white/5 pt-2">
                <button onClick={() => openEdit(s)} className="btn-icon" aria-label={`Editar ${s.name}`}><Pencil size={16} /></button>
                <button onClick={() => setToDelete(s)} className="btn-icon hover:text-danger" aria-label={`Eliminar ${s.name}`}><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} title={editing ? 'Editar servicio' : 'Nuevo servicio'} onClose={() => setOpen(false)}>
        <form onSubmit={save} noValidate>
          <label className="label" htmlFor="s-name">Nombre</label>
          <div className="mb-4 flex gap-2">
            <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
            <input id="s-name" className="input" value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <label className="label" htmlFor="s-desc">Descripción</label>
          <textarea id="s-desc" rows={4} className="input mb-4 resize-y" value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <label className="label" htmlFor="s-price">Precio (€)</label>
          <input id="s-price" inputMode="decimal" className="input mb-5 font-mono" value={draft.price} placeholder="0,00"
            onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          {formError && <p className="mb-4 text-sm text-danger" role="alert">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1 sm:flex-none">Cancelar</button>
            <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={saving}>Guardar</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Eliminar servicio"
        message={`¿Eliminar "${toDelete?.name}"? Se quitará también de los proyectos que lo usen.`}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await remove(toDelete.id); setToDelete(null) }} />
    </>
  )
}
