import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { deleteUser, listUsers, updateUser } from "../api/admin";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../features/auth/AuthContext";
import { useDateFormat } from "../hooks/useDateFormat";
import { useWorkspace } from "../stores/WorkspaceStore";
import { usePreferences } from "../stores/PreferencesStore";
import type { AdminUser } from "../types";
import "../styles/admin.css";

export function AdminPage() {
  const { user: currentUser } = useAuth();
  const { setError, setNotice } = useWorkspace();
  const { t } = usePreferences();
  const dateFormat = useDateFormat();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("adminLoadError"));
    } finally {
      setLoading(false);
    }
  }, [setError, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleUsers = useMemo(() => {
    const wanted = query.trim().toLowerCase();
    if (!wanted) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(wanted) ||
        user.email.toLowerCase().includes(wanted),
    );
  }, [users, query]);

  async function change(
    user: AdminUser,
    changes: { role?: "user" | "admin"; disabled?: boolean },
  ) {
    setError("");
    try {
      const updated = await updateUser(user.id, changes);
      setUsers((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setNotice({ kind: "success", message: t("userUpdated") });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("adminUpdateError"),
      );
    }
  }

  async function confirmDelete() {
    const target = userToDelete;
    setUserToDelete(null);
    if (!target) return;
    setError("");
    try {
      await deleteUser(target.id);
      setUsers((current) => current.filter((entry) => entry.id !== target.id));
      setNotice({ kind: "success", message: t("userDeleted") });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("adminUpdateError"),
      );
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{t("adminEyebrow")}</p>
          <h1>{t("admin")}</h1>
          <p className="page-subtitle">{t("adminSubtitle")}</p>
        </div>
      </section>

      <div className="admin-stats">
        <div className="admin-stat">
          <span>{t("adminTotalUsers")}</span>
          <strong>{users.length}</strong>
        </div>
        <div className="admin-stat">
          <span>{t("adminAdmins")}</span>
          <strong>
            {users.filter((user) => user.role === "admin").length}
          </strong>
        </div>
        <div className="admin-stat">
          <span>{t("statusBlocked")}</span>
          <strong>{users.filter((user) => user.disabled).length}</strong>
        </div>
        <div className="admin-stat">
          <span>{t("adminUnverified")}</span>
          <strong>{users.filter((user) => !user.emailVerified).length}</strong>
        </div>
      </div>

      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label={t("adminSearch")}
            placeholder={t("adminSearch")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="admin-table-wrap" aria-busy={loading}>
        {loading && !users.length ? (
          <p className="admin-empty">{t("loading")}</p>
        ) : visibleUsers.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("adminRole")}</th>
                <th>{t("adminStatus")}</th>
                <th>{t("adminVerification")}</th>
                <th>{t("adminItems")}</th>
                <th>{t("adminJoined")}</th>
                <th>{t("adminActions")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => {
                const isSelf = user.id === currentUser?.id;
                const isAdmin = user.role === "admin";
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user">
                        <span className="avatar">
                          {user.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="admin-user-copy">
                          <strong>
                            {user.name}
                            {isSelf && (
                              <span className="admin-you">({t("you")})</span>
                            )}
                          </strong>
                          <small>{user.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${isAdmin ? "is-admin" : ""}`}
                      >
                        {isAdmin ? t("roleAdmin") : t("roleUser")}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${user.disabled ? "is-blocked" : "is-active"}`}
                      >
                        {user.disabled ? t("statusBlocked") : t("statusActive")}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${user.emailVerified ? "is-active" : "is-unverified"}`}
                      >
                        {user.emailVerified
                          ? t("statusVerified")
                          : t("statusUnverified")}
                      </span>
                    </td>
                    <td>{user.itemCount}</td>
                    <td>{dateFormat.format(new Date(user.createdAt))}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="icon-button icon-button-small"
                          type="button"
                          disabled={isSelf}
                          title={isAdmin ? t("removeAdmin") : t("makeAdmin")}
                          aria-label={
                            isAdmin ? t("removeAdmin") : t("makeAdmin")
                          }
                          onClick={() =>
                            void change(user, {
                              role: isAdmin ? "user" : "admin",
                            })
                          }
                        >
                          {isAdmin ? (
                            <ShieldOff size={16} />
                          ) : (
                            <ShieldCheck size={16} />
                          )}
                        </button>
                        <button
                          className="icon-button icon-button-small"
                          type="button"
                          disabled={isSelf}
                          title={
                            user.disabled ? t("unblockUser") : t("blockUser")
                          }
                          aria-label={
                            user.disabled ? t("unblockUser") : t("blockUser")
                          }
                          onClick={() =>
                            void change(user, { disabled: !user.disabled })
                          }
                        >
                          {user.disabled ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <Ban size={16} />
                          )}
                        </button>
                        <button
                          className="icon-button icon-button-small danger-action"
                          type="button"
                          disabled={isSelf}
                          title={t("deleteUser")}
                          aria-label={t("deleteUser")}
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">{t("adminNoUsers")}</p>
        )}
      </div>

      {userToDelete && (
        <ConfirmDialog
          title={t("deleteUser")}
          message={`${userToDelete.name} (${userToDelete.email}) — ${t("deleteUserConfirmation")}`}
          confirmLabel={t("deleteUser")}
          onCancel={() => setUserToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </>
  );
}
