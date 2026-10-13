import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Archive,
  ArrowDown,
  Bell,
  Check,
  ChevronDown,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ItemDetails } from "../features/items/ItemDetails";
import { ItemEditor } from "../features/items/ItemEditor";
import { ItemRow } from "../features/items/ItemRow";
import { useWorkspace } from "../stores/WorkspaceStore";
import { usePreferences } from "../stores/PreferencesStore";
import type { ItemType, MemoryItem } from "../types";
import { useDateFormat } from "../hooks/useDateFormat";
import { categoryLabel } from "../utils/categories";

const itemTypes: ItemType[] = [
  "Document",
  "Receipt",
  "Note",
  "Link",
  "Image",
  "Password",
];

type TypeOption = { value: ItemType | ""; label: string };

function TypeFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: ItemType | "";
  options: TypeOption[];
  onChange: (value: ItemType | "") => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function openList() {
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setActive(
        (current) =>
          (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
          options.length,
      );
    } else if (event.key === "Home" || event.key === "End") {
      if (!open) return;
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else openList();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div
      className={`filter-field dropdown${open ? " is-open" : ""}`}
      ref={rootRef}
    >
      <Tag size={16} />
      <button
        className="dropdown-trigger"
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="dropdown-value">{options[selectedIndex].label}</span>
        <ChevronDown className="dropdown-chevron" size={16} />
      </button>
      {open && (
        <ul
          className="dropdown-menu"
          id={listId}
          role="listbox"
          aria-label={label}
        >
          {options.map((option, index) => (
            <li
              key={option.value || "all"}
              role="option"
              aria-selected={option.value === value}
              className={`dropdown-option${option.value === value ? " is-selected" : ""}${index === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={15} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ItemsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryFilter = searchParams.get("category") || "";
  const {
    items,
    searchResults,
    reminders,
    categories,
    loading,
    searching,
    search,
    saveItem,
  } = useWorkspace();
  const { t, locale } = usePreferences();
  const dateFormat = useDateFormat();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemType | "">("");
  const [selected, setSelected] = useState<MemoryItem | null>(null);
  const [editing, setEditing] = useState<MemoryItem | null | false>(false);
  const sourceItems = searchResults ?? items;
  const visibleItems = useMemo(
    () =>
      sourceItems.filter(
        (item) =>
          (!categoryFilter || item.category === categoryFilter) &&
          (!typeFilter || item.type === typeFilter),
      ),
    [sourceItems, categoryFilter, typeFilter],
  );
  const upcomingReminders = reminders
    .filter((reminder) => !reminder.completed)
    .slice(0, 3);

  function updateSearch(value: string) {
    setQuery(value);
    search(value);
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{t("tagline")}</p>
          <h1>{t("savedThings")}</h1>
          <p className="page-subtitle">{t("savedSubtitle")}</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setEditing(null)}
        >
          <Plus size={17} />
          {t("addToBox")}
        </button>
      </section>
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label={t("allSaved")}
            placeholder={t("search")}
            value={query}
            onChange={(event) => updateSearch(event.target.value)}
          />
        </label>
        <TypeFilter
          label={t("filterType")}
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "", label: t("allTypes") },
            ...itemTypes.map((type) => ({ value: type, label: t(type) })),
          ]}
        />
        <span className="sort-indicator">
          <ArrowDown size={15} />
          {t("recent")}
        </span>
      </div>
      <div className="result-count">
        <span>
          {visibleItems.length} {t("results")}
        </span>
        {categoryFilter && <span>{categoryLabel(categoryFilter, locale)}</span>}
      </div>
      <div className="workspace-grid">
        <section
          className="item-list"
          aria-label={t("allSaved")}
          aria-busy={loading || searching}
        >
          {loading && !items.length ? (
            <div className="empty-state">
              <span className="loading-spinner" />
              {t("loading")}
            </div>
          ) : visibleItems.length ? (
            visibleItems.map((item) => (
              <ItemRow
                key={item._id}
                item={item}
                onClick={() => setSelected(item)}
              />
            ))
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon">
                <Archive size={21} />
              </span>
              <h2>
                {query || categoryFilter || typeFilter
                  ? t("nothingFound")
                  : t("boxReady")}
              </h2>
              <p>
                {query || categoryFilter || typeFilter
                  ? t("searchHint")
                  : t("firstSave")}
              </p>
              {!query && !categoryFilter && !typeFilter && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  <Plus size={16} />
                  {t("addFirst")}
                </button>
              )}
            </div>
          )}
        </section>
        <aside className="overview-card">
          <div className="rail-heading">
            <span className="rail-icon">
              <Bell size={16} />
            </span>
            <h2>{t("comingUp")}</h2>
            <button
              className="text-link"
              type="button"
              onClick={() => navigate("/reminders")}
            >
              {t("seeAll")}
            </button>
          </div>
          {upcomingReminders.length ? (
            upcomingReminders.map((reminder) => (
              <div className="upcoming-row" key={reminder._id}>
                <span className="reminder-calendar">
                  <strong>{new Date(reminder.reminderDate).getDate()}</strong>
                </span>
                <span className="upcoming-copy">
                  <strong>{reminder.title}</strong>
                  <small>
                    {dateFormat.format(new Date(reminder.reminderDate))}
                  </small>
                </span>
              </div>
            ))
          ) : (
            <p className="empty-copy">{t("quietMoment")}</p>
          )}
          <div className="overview-divider" />
          <div className="rail-heading">
            <span className="rail-icon mint">
              <Archive size={16} />
            </span>
            <h2>{t("atGlance")}</h2>
          </div>
          <div className="stat-line">
            <span>{t("savedItems")}</span>
            <strong>{items.length}</strong>
          </div>
          <div className="stat-line">
            <span>{t("categories")}</span>
            <strong>{categories.length}</strong>
          </div>
          <div className="stat-line">
            <span>{t("openReminders")}</span>
            <strong>
              {reminders.filter((reminder) => !reminder.completed).length}
            </strong>
          </div>
        </aside>
      </div>
      {selected && (
        <ItemDetails
          item={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
          }}
          onOpenRelated={setSelected}
        />
      )}
      {editing !== false && (
        <ItemEditor
          item={editing || undefined}
          categories={categories}
          onClose={() => setEditing(false)}
          onSave={async (input, file) => {
            const saved = await saveItem(input, file, editing || undefined);
            setSelected(saved);
            return saved;
          }}
        />
      )}
    </>
  );
}
