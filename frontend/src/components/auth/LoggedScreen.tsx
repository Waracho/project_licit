import type { User } from "../../features/auth/types";

type Props = {
  user: User;
  onLogout?: () => void;
};

export default function LoggedScreen({ user, onLogout }: Props) {
  return (
    <div className="max-w-lg w-full mx-auto mt-24 p-6 border rounded-2xl shadow-sm">
      <h1 className="text-xl font-semibold mb-4">¡Conectado! 🎉</h1>
      <div className="space-y-1">
        <p><span className="font-medium">Usuario:</span> {user.userName}</p>
        <p><span className="font-medium">Email:</span> {user.mail}</p>
        <p><span className="font-medium">Rol:</span> {user.role?.name ?? user.rolId ?? "—"}</p>
      </div>
      <p className="mt-4 text-green-700">Sesión iniciada correctamente.</p>

      {onLogout && (
        <button
          className="mt-6 rounded-xl px-4 py-2 border"
          onClick={onLogout}
        >
          Cerrar sesión
        </button>
      )}
    </div>
  );
}
