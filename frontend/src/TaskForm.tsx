import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export default function TaskForm() {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState<string>('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Array<{id:string; title:string; priority:string; due_date?:string|null; done:boolean}>>([]);

  const loadTasks = async () => {
    const res = await fetch(`${API_URL}/tasks`);
    const data = await res.json();
    setTasks(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          priority,
          due_date: dueDate || null,
          done
        })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }

      // recargar lista
      await loadTasks();

      // limpiar form
      setTitle('');
      setPriority('medium');
      setDueDate('');
      setDone(false);
    } catch (err) {
      console.error(err);
      alert('Error creando task');
    } finally {
      setLoading(false);
    }
  };

  // cargar al montar
  useState(() => { loadTasks(); return undefined; });

  return (
    <div style={{ maxWidth: 520, margin: '24px auto', padding: 16 }}>
      <h2>Crear Task</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Título
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="Ej: Revisar tablero eléctrico"
            style={{ width: '100%', padding: 8 }}
          />
        </label>

        <label>
          Prioridad
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as any)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>

        <label>
          Fecha límite
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={done}
            onChange={e => setDone(e.target.checked)}
          />
          ¿Completada?
        </label>

        <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </form>

      <hr style={{ margin: '24px 0' }} />

      <h3>Tasks</h3>
      <button onClick={loadTasks} style={{ padding: '6px 10px', marginBottom: 12 }}>Refrescar</button>
      <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
        {tasks.map(t => (
          <li key={t.id} style={{ border: '1px solid #4443', padding: 10, borderRadius: 8 }}>
            <div><b>{t.title}</b></div>
            <div>Priority: {t.priority}</div>
            <div>Due: {t.due_date ?? '—'}</div>
            <div>Done: {t.done ? 'sí' : 'no'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
