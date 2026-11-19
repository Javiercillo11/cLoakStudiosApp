import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

let channelSeq = 0

/**
 * Llama a `onChange` cada vez que se inserta, modifica o borra una solicitud
 * (Supabase Realtime; RLS limita los eventos a las filas del usuario).
 * Al volver a la pestaña también se refresca, por si el móvil cortó la conexión.
 */
export function useLeadsRealtime(onChange: () => void) {
  const cb = useRef(onChange)
  cb.current = onChange

  useEffect(() => {
    const channel = supabase
      .channel(`leads-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => cb.current())
      .subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') cb.current() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [])
}

/** Número de solicitudes en estado "nuevo". null mientras carga o si la tabla aún no existe. */
export function useNewLeadsCount() {
  const [count, setCount] = useState<number | null>(null)
  const load = useCallback(async () => {
    const { count, error } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'nuevo')
    setCount(error ? null : count ?? 0)
  }, [])
  useEffect(() => { load() }, [load])
  useLeadsRealtime(load)
  return count
}
