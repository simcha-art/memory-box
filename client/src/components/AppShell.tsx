import { useState, type FormEvent } from "react";
import { Archive, Bell, Box, LogOut, Plus, X } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useWorkspace } from "../stores/WorkspaceStore";
import { usePreferences } from "../stores/PreferencesStore";
import { PreferenceControls } from "./PreferenceControls";
import { Dialog } from "./Dialog";

export function AppShell() {
    const { user, logout } = useAuth();
    const {
        categories,
        items,
        reminders,
        addCategory,
        error,
        setError,
        notice,
        dismissNotice,
        setNotice,
    } = useWorkspace();
    const { t } = usePreferences();
    const navigate = useNavigate();
    const location = useLocation();
    const selectedCategory = new URLSearchParams(location.search).get(
        "category",
    );
    const [categoryDialog, setCategoryDialog] = useState(false);
    const [categoryName, setCategoryName] = useState("");
    const openReminders = reminders.filter(
        (reminder) => !reminder.completed,
    ).length;
    const sidebarCategories = [
        { _id: "all", name: t("all") },
        ...categories.filter((category) => category._id !== "all"),
    ];

    async function submitCategory(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = categoryName.trim();
        if (!name) return;
        try {
            const category = await addCategory(name);
            setCategoryName("");
            setCategoryDialog(false);
            setNotice({ kind: "success", message: t("categoryAdded") });
            navigate(`/items?category=${encodeURIComponent(category.name)}`);
        } catch (reason) {
            setError(
                reason instanceof Error ? reason.message : t("categoryError"),
            );
        }
    }

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <NavLink className="brand" to="/items" aria-label={t("brand")}>
                    <span className="brand-icon">
                        <Box size={20} strokeWidth={2.3} />
                    </span>
                    <span>
                        memory<span className="brand-light">box</span>
                    </span>
                </NavLink>
                <p className="section-label">{t("yourSpace")}</p>
                <nav className="primary-nav" aria-label={t("yourSpace")}>
                    <NavLink
                        to="/items"
                        className={({ isActive }) =>
                            `nav-link ${isActive && !selectedCategory ? "active" : ""}`
                        }
                    >
                        <Archive size={18} />
                        <span>{t("allSaved")}</span>
                        <span className="nav-count">{items.length}</span>
                    </NavLink>
                    <NavLink
                        to="/reminders"
                        className={({ isActive }) =>
                            `nav-link ${isActive ? "active" : ""}`
                        }
                    >
                        <Bell size={18} />
                        <span>{t("reminders")}</span>
                        <span className="nav-count">{openReminders}</span>
                    </NavLink>
                </nav>
                <div className="category-heading">
                    <p className="section-label">{t("categories")}</p>
                    <button
                        className="icon-button icon-button-small"
                        type="button"
                        aria-label={t("addCategory")}
                        title={t("addCategory")}
                        onClick={() => setCategoryDialog(true)}
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <nav className="category-list" aria-label={t("categories")}>
                    {sidebarCategories.map((category) =>
                        category._id === "all" ? (
                            <NavLink
                                key={category._id}
                                to="/items"
                                className={`category-link ${selectedCategory === null ? "active" : ""}`}
                            >
                                <span className="category-dot" />
                                {category.name}
                            </NavLink>
                        ) : (
                            <NavLink
                                key={category._id}
                                to={`/items?category=${encodeURIComponent(category.name)}`}
                                className={`category-link ${selectedCategory === category.name ? "active" : ""}`}
                            >
                                <span className="category-dot" />
                                {category.name}
                            </NavLink>
                        ),
                    )}
                    {!categories.length && (
                        <p className="empty-categories">
                            {t("emptyCategories")}
                        </p>
                    )}
                </nav>
                <nav
                    className="mobile-category-list"
                    aria-label={t("categories")}
                >
                    {sidebarCategories.map((category) =>
                        category._id === "all" ? (
                            <NavLink
                                key={category._id}
                                to="/items"
                                className={`mobile-category-chip ${selectedCategory === null ? "active" : ""}`}
                            >
                                {category.name}
                            </NavLink>
                        ) : (
                            <NavLink
                                key={category._id}
                                to={`/items?category=${encodeURIComponent(category.name)}`}
                                className={`mobile-category-chip ${selectedCategory === category.name ? "active" : ""}`}
                            >
                                {category.name}
                            </NavLink>
                        ),
                    )}
                    <button
                        className="mobile-category-chip add-category-chip"
                        type="button"
                        onClick={() => setCategoryDialog(true)}
                    >
                        <Plus size={13} />
                        {t("addCategory")}
                    </button>
                </nav>
                <div className="sidebar-footer">
                    <span className="avatar">
                        {user?.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="account-name">{user?.name}</span>
                    <button
                        className="icon-button signout-button"
                        type="button"
                        onClick={logout}
                        title={t("signOut")}
                        aria-label={t("signOut")}
                    >
                        <LogOut size={17} />
                    </button>
                </div>
            </aside>
            <main className="main-area">
                <header className="topbar">
                    <div className="breadcrumb">
                        <span className="breadcrumb-dot" />
                        {t("yourBox")}
                        <span className="breadcrumb-separator">/</span>
                        <strong>{user?.name}</strong>
                    </div>
                    <div className="topbar-actions">
                        <span className="topbar-user">{user?.name}</span>
                        <PreferenceControls />
                    </div>
                </header>
                <div className="page-container">
                    {(error || notice) && (
                        <div
                            className={`notice ${error ? "notice-error" : notice?.kind === "error" ? "notice-error" : "notice-success"}`}
                            role={
                                error || notice?.kind === "error"
                                    ? "alert"
                                    : "status"
                            }
                        >
                            <span>{error || notice?.message}</span>
                            <button
                                type="button"
                                className="icon-button"
                                aria-label={t("close")}
                                onClick={() => {
                                    setError("");
                                    dismissNotice();
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    <Outlet />
                </div>
            </main>
            {categoryDialog && (
                <Dialog
                    title={t("addCategory")}
                    eyebrow={t("categories")}
                    onClose={() => setCategoryDialog(false)}
                    className="category-dialog"
                >
                    <form className="dialog-form" onSubmit={submitCategory}>
                        <p className="muted">{t("categoryPrompt")}</p>
                        <label>
                            {t("categoryName")}
                            <input
                                autoFocus
                                required
                                maxLength={80}
                                value={categoryName}
                                onChange={(event) =>
                                    setCategoryName(event.target.value)
                                }
                                placeholder={t("categoryPlaceholder")}
                            />
                        </label>
                        <footer className="dialog-actions">
                            <button
                                className="button button-secondary"
                                type="button"
                                onClick={() => setCategoryDialog(false)}
                            >
                                {t("cancel")}
                            </button>
                            <button
                                className="button button-primary"
                                type="submit"
                            >
                                <Plus size={16} />
                                {t("add")}
                            </button>
                        </footer>
                    </form>
                </Dialog>
            )}
        </div>
    );
}
