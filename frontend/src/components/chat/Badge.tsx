import { useEffect, useState } from "react";
import { unreadCount } from "../../features/chats/api";
import { useAuth } from "../../features/auth/useAuth";

export default function ChatBadge() {
  const { user } = useAuth();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const tick = async () => {
      try {
        const { total } = await unreadCount(user.id);
        if (alive) setN(total);
      } catch {}
      if (alive) setTimeout(tick, 5000); // poll 5s
    };
    tick();
    return () => { alive = false; };
  }, [user?.id]);

  if (!user?.id) return null;
  return (
    <div className="chat-badge">
      Chats {n > 0 ? <span className="bubble">{n}</span> : null}
    </div>
  );
}