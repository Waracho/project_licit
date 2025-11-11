// src/components/chat/FloatingChatButton.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../features/auth/useAuth";
import {
  unreadCount, listMyChats, listMessages, sendMessage, markRead,
  type Chat, type ChatMessage
} from "../../features/chats/api";
import { startChat } from "../../features/chats/api";
import "./FloatingChatButton.css";

export default function FloatingChatButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  // poll de no leídos (badge)
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const tick = async () => {
      try {
        const { total } = await unreadCount(user.id);
        if (alive) setCount(total);
      } catch {}
      if (alive) setTimeout(tick, 5000);
    };
    tick();
    return () => { alive = false; };
  }, [user?.id]);

  if (!user?.id) return null;

  return (
    <>
      <button
        className="fab-chat"
        onClick={() => setOpen(v => !v)}
        aria-label="Abrir chats"
        title="Chats"
      >
        💬
        {count > 0 && <span className="fab-badge">{count}</span>}
      </button>

      {open && <MiniChatPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function MiniChatPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [sel, setSel] = useState<Chat | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // lista de chats (poll suave)
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const loop = async () => {
      try {
        const rows = await listMyChats(user.id);
        if (!alive) return;
        setChats(rows);
        if (!sel && rows.length) setSel(rows[0]);
      } catch {}
      if (alive) setTimeout(loop, 4000);
    };
    loop();
    return () => { alive = false; };
  }, [user?.id]);

  // mensajes del chat seleccionado
  useEffect(() => {
    if (!sel) return;
    let alive = true;
    let last: string | undefined;

    const loop = async () => {
      try {
        const newMsgs = await listMessages(sel.id, last);
        if (!alive) return;
        if (newMsgs.length) {
          setMsgs(prev => [...prev, ...newMsgs]);
          last = newMsgs[newMsgs.length - 1].createdAt;
          endRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      } catch {}
      if (alive) setTimeout(loop, 1500);
    };

    setMsgs([]); last = undefined;
    loop();
    // marcar leído al abrir
    if (user?.id) markRead(sel.id, user.id).catch(()=>{});
    return () => { alive = false; };
  }, [sel?.id, user?.id]);

  const myUnread = useMemo(() => {
    if (!sel || !user?.id) return 0;
    return user.id === sel.bidderUserId ? sel.unreadBidder : sel.unreadWorker;
  }, [sel, user?.id]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel || !user?.id || !input.trim()) return;
    const text = input.trim();
    setInput("");
    await sendMessage(sel.id, user.id, text).catch(() => {
      // si falla, repon el input
      setInput(text);
    });
  };

  return (
    <div className="chat-panel-wrap" role="dialog" aria-label="Chats">
      <div className="chat-panel">
        <header className="chat-panel__header">
            <strong>Mis chats</strong>
            <div style={{display:"flex", gap:8}}>
                <button className="xbtn" onClick={async () => {
                // 👇 CREA CHAT CON WORKER AL AZAR
                try {
                    const u = user!;
                    const chat = await startChat(u.id); // sin workerUserId => azar
                    setSel(chat);
                    setMsgs([]); // se recargan en el efecto
                } catch (e) { /* opcional: toast */ }
                }}>Conectar</button>
                <button className="xbtn" onClick={onClose} aria-label="Cerrar">✕</button>
            </div>
        </header>

        <div className="chat-panel__body">
          <aside className="chat-panel__list">
            {chats.map(c => {
              const unread = (user?.id === c.bidderUserId ? c.unreadBidder : c.unreadWorker) || 0;
              const active = sel?.id === c.id;
              return (
                <button key={c.id}
                  className={"list-item" + (active ? " is-active" : "")}
                  onClick={() => setSel(c)}
                  title={c.lastMessagePreview ?? ""}
                >
                  <div className="li-title">Chat #{c.id.slice(-6)}</div>
                  <div className="li-sub">{c.lastMessagePreview ?? "Sin mensajes"}</div>
                  {unread > 0 && <span className="li-badge">{unread}</span>}
                </button>
              );
            })}
            {chats.length === 0 && <div className="empty">Aún no tienes chats.</div>}
          </aside>

          <section className="chat-panel__chat">
            {sel ? (
              <>
                <div className="chat-head">
                  <div>Chat #{sel.id.slice(-6)}</div>
                  {myUnread > 0 && <span className="li-badge">{myUnread}</span>}
                </div>
                <div className="chat-msgs">
                  {msgs.map(m => (
                    <div key={m.id} className={"msg" + (m.senderUserId === user?.id ? " me" : "")}>
                      <div className="msg-t">{m.text}</div>
                      <div className="msg-time">{new Date(m.createdAt).toLocaleTimeString()}</div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
                <form className="chat-send" onSubmit={onSend}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Escribe un mensaje…"
                  />
                  <button disabled={!input.trim()}>Enviar</button>
                </form>
              </>
            ) : (
              <div className="empty">Selecciona un chat</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
