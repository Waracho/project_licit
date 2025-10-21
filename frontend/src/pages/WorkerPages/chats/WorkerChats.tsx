import { useEffect, useRef, useState } from "react";
import {
  listMyChats,
  listMessages,
  sendMessage,
  markRead,
  startChatWith,
  listUsersByRoleKey,
  type Chat,
  type ChatMessage,
} from "../../../features/chats/api";
import { useAuth } from "../../../features/auth/useAuth";
import "./WorkerChats.css";

type SimpleUser = { id: string; userName: string; mail: string };

export default function WorkerChats() {
  const { user } = useAuth(); // WORKER
  const [tab, setTab] = useState<"chats" | "users">("chats");

  // Sidebar responsive
  const [showList, setShowList] = useState(true);

  // Datos
  const [chats, setChats] = useState<Chat[]>([]);
  const [sel, setSel] = useState<Chat | null>(null);

  const [bidders, setBidders] = useState<SimpleUser[]>([]);
  const [q, setQ] = useState("");

  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // ====== Cargar "Mis chats" (poll) ======
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;

    const loop = async () => {
      try {
        const rows = await listMyChats(user.id);
        if (!alive) return;

        setChats(rows);

        // si no hay seleccionado, el más reciente
        if (!sel && rows.length) setSel(rows[0]);

        // sincroniza counters del seleccionado
        if (sel) {
          const upd = rows.find(r => r.id === sel.id);
          if (upd) setSel(upd);
        }
      } catch {
        /* noop */
      } finally {
        if (alive) setTimeout(loop, 4000);
      }
    };

    loop();
    return () => {
      alive = false;
    };
  }, [user?.id, sel?.id]);

  // ====== Cargar/filtrar BIDDERS (para iniciar chat manualmente) ======
  useEffect(() => {
    if (!user?.id || tab !== "users") return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const rows = await listUsersByRoleKey("BIDDER", q || undefined);
        if (!alive) return;
        setBidders(rows);
      } catch {
        setBidders([]);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [user?.id, tab, q]);

  // ====== Poll de mensajes para el chat seleccionado ======
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
      } catch {
        /* noop */
      } finally {
        if (alive) setTimeout(loop, 1500);
      }
    };

    setMsgs([]);
    last = undefined;
    loop();

    // marcar leído al abrir
    if (user?.id) markRead(sel.id, user.id).catch(() => {});

    return () => {
      alive = false;
    };
  }, [sel?.id, user?.id]);

  // ====== Acciones ======
  const openChat = (c: Chat) => {
    setSel(c);
    setTab("chats");
    // en mobile, cierra la lista para que el panel ocupe todo
    setShowList(false);
  };

  const openWithBidder = async (bidderId: string) => {
    if (!user?.id) return;
    try {
      const chat = await startChatWith(bidderId, user.id);
      setSel(chat);
      setMsgs([]);
      setTab("chats");
      setShowList(false);
      if (user?.id) markRead(chat.id, user.id).catch(() => {});
    } catch (e) {
      console.error("startChatWith failed", e);
    }
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel || !user?.id || !input.trim()) return;
    const text = input.trim();
    setInput("");
    try {
      await sendMessage(sel.id, user.id, text);
    } catch {
      setInput(text); // restore on fail
    }
  };

  return (
    <div className="wc">
      <div className="wc__inner">
        {/* Sidebar */}
        <aside className={"wc__list" + (showList ? "" : " is-hidden")}>
          <div className="wc__tabs">
            <button
              className={"wc__tab" + (tab === "chats" ? " is-active" : "")}
              onClick={() => setTab("chats")}
            >
              Mis chats
            </button>
            <button
              className={"wc__tab" + (tab === "users" ? " is-active" : "")}
              onClick={() => setTab("users")}
            >
              Usuarios
            </button>
          </div>

          {tab === "chats" ? (
            <div className="wc__list-body">
              {chats.map(c => {
                const myUnread =
                  user?.id === c.workerUserId ? c.unreadWorker : c.unreadBidder;
                const active = sel?.id === c.id;
                return (
                  <button
                    key={c.id}
                    className={"wc-item" + (active ? " is-active" : "")}
                    onClick={() => openChat(c)}
                    title={c.lastMessagePreview ?? ""}
                  >
                    <div className="wc-item__title">Chat #{c.id.slice(-6)}</div>
                    <div className="wc-item__sub">
                      {c.lastMessagePreview ?? "Sin mensajes"}
                    </div>
                    {myUnread > 0 && <span className="wc-item__badge">{myUnread}</span>}
                  </button>
                );
              })}
              {chats.length === 0 && (
                <div className="wc-empty">No tienes chats aún.</div>
              )}
            </div>
          ) : (
            <div className="wc__list-body">
              <div className="wc-search">
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Buscar BIDDER…"
                />
              </div>
              {bidders.map(u => (
                <button
                  key={u.id}
                  className="wc-item"
                  onClick={() => openWithBidder(u.id)}
                  title={u.mail}
                >
                  <div className="wc-item__title">{u.userName}</div>
                  <div className="wc-item__sub">{u.mail}</div>
                </button>
              ))}
              {bidders.length === 0 && (
                <div className="wc-empty">Sin resultados</div>
              )}
            </div>
          )}
        </aside>

        {/* Panel de Chat */}
        <section className="wc__chat">
          <header className="wc__chatbar">
            <button
              className="wc__toggle"
              onClick={() => setShowList(s => !s)}
              aria-label="Mostrar/ocultar lista"
              title="Mostrar/ocultar lista"
            >
              ☰
            </button>
            <h1 className="wc__title">
              {sel ? `Chat #${sel.id.slice(-6)}` : "Chats"}
            </h1>
          </header>

          {sel ? (
            <>
              <div className="wc__msgs">
                {msgs.map(m => (
                  <div
                    key={m.id}
                    className={"wc-msg" + (m.senderUserId === user?.id ? " me" : "")}
                  >
                    <div className="wc-msg__text">{m.text}</div>
                    <div className="wc-msg__time">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form className="wc__send" onSubmit={onSend}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Escribe un mensaje…"
                />
                <button disabled={!input.trim()}>Enviar</button>
              </form>
            </>
          ) : (
            <div className="wc-empty wc-empty--center">
              {tab === "users"
                ? "Selecciona un usuario BIDDER"
                : "Selecciona un chat de la lista"}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
