import { useMemo, useState } from "react";
import { Check, Circle, Repeat, Trash2 } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useDateFormat } from "../../hooks/useDateFormat";
import { usePreferences } from "../../stores/PreferencesStore";
import { repeatMessages } from "./repeatMessages";
import type { Reminder } from "../../types";

export function ReminderRow({
  reminder,
  onToggle,
  onOpen,
  onDelete,
}: {
  reminder: Reminder;
  onToggle: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t, locale } = usePreferences();
  const dateFormat = useDateFormat();
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const repeatLabel =
    reminder.repeat && reminder.repeat !== "none"
      ? repeatMessages[locale][reminder.repeat]
      : "";
  const linkedItem =
    typeof reminder.itemId === "string"
      ? t("savedItems")
      : reminder.itemId?.title || t("savedItems");

  return (
    <>
      <article
        className={`reminder-row ${reminder.completed ? "completed" : ""}`}
      >
        <button
          className="reminder-toggle"
          type="button"
          aria-label={
            reminder.completed ? t("reopenReminder") : t("completeReminder")
          }
          onClick={onToggle}
        >
          {reminder.completed ? <Check size={14} /> : <Circle size={18} />}
        </button>
        <button className="reminder-copy" type="button" onClick={onOpen}>
          <strong>{reminder.title}</strong>
          <span>{linkedItem}</span>
          {repeatLabel && (
            <span title={repeatMessages[locale].label}>
              <Repeat size={12} aria-hidden="true" /> {repeatLabel}
            </span>
          )}
        </button>
        <time dateTime={reminder.reminderDate}>
          {dateFormat.format(new Date(reminder.reminderDate))},{" "}
          {timeFormat.format(new Date(reminder.reminderDate))}
        </time>
        <button
          className="icon-button icon-button-small danger-action"
          type="button"
          title={t("deleteReminder")}
          aria-label={t("deleteReminder")}
          onClick={() => setConfirmingDelete(true)}
        >
          <Trash2 size={15} />
        </button>
      </article>
      {confirmingDelete && (
        <ConfirmDialog
          title={t("deleteReminder")}
          message={t("reminderConfirmation")}
          confirmLabel={t("deleteReminder")}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete();
          }}
        />
      )}
    </>
  );
}
