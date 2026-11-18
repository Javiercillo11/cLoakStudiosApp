import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/** CRUD genérico sobre una tabla de Supabase. */
export function useTable<T extends { id: string }>(table: string, select = '*') {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setError(null)
      setRows((data ?? []) as unknown as T[])
    }
    setLoading(false)
  }, [table, select])

  useEffect(() => {
    reload()
  }, [reload])

  const insert = async (values: Partial<T>) => {
    const { data, error } = await supabase.from(table).insert(values as Record<string, unknown>).select('id').single()
    if (error) throw new Error(error.message)
    await reload()
    return data.id as string
  }

  const update = async (id: string, values: Partial<T>) => {
    const { error } = await supabase.from(table).update(values as Record<string, unknown>).eq('id', id)
    if (error) throw new Error(error.message)
    await reload()
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw new Error(error.message)
    setRows((r) => r.filter((x) => x.id !== id))
  }

  return { rows, loading, error, reload, insert, update, remove }
}
