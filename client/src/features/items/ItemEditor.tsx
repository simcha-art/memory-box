import { useState, type ChangeEvent, type FormEvent } from "react";
import { Eye, EyeOff, FileUp, Plus, Wand2, X } from "lucide-react";
import { Dialog } from "../../components/Dialog";
import { PopupNotice } from "../../components/PopupNotice";
import { usePreferences } from "../../stores/PreferencesStore";
import {
  MAX_FILE_BYTES,
  acceptFor,
  fileAllowed,
  fileNameAllowed,
  formatLabelFor,
  inputKindFor,
} from "../../utils/fileRules";
import {
  OTHER_CATEGORY_LABEL,
  categoryLabel,
  findCategoryName,
} from "../../utils/categories";
import type { Category, ItemInput, ItemType, MemoryItem } from "../../types";

function generatePassword(length = 20): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+";
  const limit = Math.floor(256 / alphabet.length) * alphabet.length; // avoid modulo bias
  let result = "";
  while (result.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < limit && result.length < length)
        result += alphabet[byte % alphabet.length];
    }
  }
  return result;
}

const itemTypes: ItemType[] = [
  "Document",
  "Receipt",
  "Note",
  "Link",
  "Image",
  "Password",
];

const OTHER_CATEGORY = "__other__";

export function ItemEditor({
  item,
  categories,
  onClose,
  onSave,
}: {
  item?: MemoryItem;
  categories: Category[];
  onClose: () => void;
  onSave: (input: ItemInput, file?: File) => Promise<MemoryItem>;
}) {
  const { t, locale } = usePreferences();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<ItemType>(item?.type || "Document");
  const [fileError, setFileError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [categoryChoice, setCategoryChoice] = useState(item?.category || "");
  const [newCategory, setNewCategory] = useState("");
  const [tagFields, setTagFields] = useState<string[]>(
    item?.tags.length ? item.tags : [""],
  );
  const lastTagEmpty = !tagFields[tagFields.length - 1]?.trim();
  const kind = inputKindFor(type);
  const staleFile = Boolean(
    item?.fileName && !fileNameAllowed(type, item.fileName),
  );

  const categoryNames = categories.map((category) => category.name);
  const categoryOptions =
    item?.category && !categoryNames.includes(item.category)
      ? [...categoryNames, item.category]
      : categoryNames;

  function updateTag(index: number, value: string) {
    setTagFields((current) =>
      current.map((tag, i) => (i === index ? value : tag)),
    );
  }

  function addTagField() {
    setTagFields((current) =>
      current[current.length - 1]?.trim() ? [...current, ""] : current,
    );
  }

  function removeTagField(index: number) {
    setTagFields((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : [""],
    );
  }

  function changeType(next: ItemType) {
    setType(next);
    setFileError("");
    setError("");
  }

  function checkFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) return setFileError("");
    if (!fileAllowed(type, picked)) {
      event.target.value = "";
      return setFileError(`${t("fileWrongFormat")} ${formatLabelFor(type)}`);
    }
    if (picked.size > MAX_FILE_BYTES) {
      event.target.value = "";
      return setFileError(t("fileTooLarge"));
    }
    setFileError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    let category = categoryChoice;
    if (categoryChoice === OTHER_CATEGORY) {
      const typed = newCategory.trim();
      if (!typed) return setError(t("categoryName"));
      category = findCategoryName(typed, categoryNames) || typed;
    }

    const input: ItemInput = {
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim(),
      type,
      url:
        type === "Link" || type === "Password"
          ? String(form.get("url") || "").trim()
          : "",
      ...(type === "Password"
        ? {
            username: String(form.get("username") || "").trim(),
            ...(password ? { password } : {}),
          }
        : {}),
      category,
      tags: [...new Set(tagFields.map((tag) => tag.trim()).filter(Boolean))],
      date: String(form.get("date") || new Date().toISOString().slice(0, 10)),
    };
    if (type === "Password" && !password && !item?.hasPassword)
      return setError(t("passwordRequired"));
    const selectedFile = form.get("file");
    const file =
      kind === "file" && selectedFile instanceof File && selectedFile.size > 0
        ? selectedFile
        : undefined;
    if (file && (!fileAllowed(type, file) || file.size > MAX_FILE_BYTES))
      return;
    setSaving(true);
    setError("");
    try {
      await onSave(input, file);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={item ? t("editItem") : t("saveSomething")}
      eyebrow={item ? t("updateArchive") : t("addArchive")}
      onClose={onClose}
      className="editor-dialog"
    >
      <form className="editor-form" onSubmit={submit}>
        <label>
          {t("title")}
          <input
            name="title"
            required
            maxLength={160}
            defaultValue={item?.title}
            autoFocus
            placeholder={t("titlePlaceholder")}
          />
        </label>
        <div className="form-columns">
          <label>
            {t("type")}
            <select
              name="type"
              value={type}
              onChange={(event) => changeType(event.target.value as ItemType)}
            >
              {itemTypes.map((type) => (
                <option key={type} value={type}>
                  {t(type)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("date")}
            <input
              name="date"
              type="date"
              defaultValue={
                item?.date?.slice(0, 10) ||
                new Date().toISOString().slice(0, 10)
              }
            />
          </label>
        </div>
        <label>
          {t("category")}
          <select
            name="category-choice"
            value={categoryChoice}
            onChange={(event) => setCategoryChoice(event.target.value)}
          >
            <option value="">{t("noCategory")}</option>
            {categoryOptions.map((name) => (
              <option key={name} value={name}>
                {categoryLabel(name, locale)}
              </option>
            ))}
            <option value={OTHER_CATEGORY}>
              {OTHER_CATEGORY_LABEL[locale]}
            </option>
          </select>
        </label>
        {categoryChoice === OTHER_CATEGORY && (
          <label>
            {t("categoryName")}
            <input
              name="new-category"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              required
              maxLength={80}
              autoFocus
              placeholder={t("categoryPlaceholder")}
            />
          </label>
        )}
        <div className="tag-fields">
          <span className="tag-fields-label">{t("tags")}</span>
          {tagFields.map((tag, index) => (
            <div className="tag-field-row" key={index}>
              <input
                value={tag}
                maxLength={40}
                aria-label={`${t("tags")} ${index + 1}`}
                placeholder={t("tagsPlaceholder")}
                onChange={(event) => updateTag(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTagField();
                  }
                }}
              />
              {tagFields.length > 1 && (
                <button
                  className="icon-button icon-button-small"
                  type="button"
                  title={t("removeTag")}
                  aria-label={t("removeTag")}
                  onClick={() => removeTagField(index)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            className="button button-secondary add-tag-button"
            type="button"
            disabled={lastTagEmpty}
            onClick={addTagField}
          >
            <Plus size={16} />
            {t("addTag")}
          </button>
        </div>
        <label>
          {t("description")}
          <textarea
            name="description"
            rows={4}
            maxLength={10000}
            defaultValue={item?.description}
            placeholder={t("descriptionPlaceholder")}
          />
        </label>
        {kind === "link" && (
          <label>
            {t("linkLabel")}
            <input
              name="url"
              type="url"
              required
              maxLength={2048}
              defaultValue={item?.url}
              placeholder={t("linkPlaceholder")}
              dir="ltr"
              pattern="https?://.+"
            />
            <span className="field-hint">{t("linkHint")}</span>
          </label>
        )}
        {kind === "none" && <p className="field-hint">{t("noteHint")}</p>}
        {kind === "password" && (
          <>
            <label>
              {t("username")}
              <input
                name="username"
                maxLength={200}
                defaultValue={item?.username}
                placeholder={t("usernamePlaceholder")}
                dir="ltr"
                autoComplete="off"
              />
            </label>
            <label>
              {t("passwordField")}
              <span className="secret-input">
                <input
                  name="password-value"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  maxLength={512}
                  dir="ltr"
                  autoComplete="new-password"
                  placeholder={
                    item?.hasPassword ? t("passwordKeepPlaceholder") : ""
                  }
                />
                <button
                  className="icon-button icon-button-small"
                  type="button"
                  title={showPassword ? t("hidePassword") : t("showPassword")}
                  aria-label={
                    showPassword ? t("hidePassword") : t("showPassword")
                  }
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  className="icon-button icon-button-small"
                  type="button"
                  title={t("generatePassword")}
                  aria-label={t("generatePassword")}
                  onClick={() => {
                    setPassword(generatePassword());
                    setShowPassword(true);
                  }}
                >
                  <Wand2 size={16} />
                </button>
              </span>
              <span className="field-hint">{t("passwordEncryptedHint")}</span>
            </label>
            <label>
              {t("websiteLabel")}
              <input
                name="url"
                type="url"
                maxLength={2048}
                defaultValue={item?.url}
                placeholder={t("linkPlaceholder")}
                dir="ltr"
                pattern="https?://.+"
              />
            </label>
          </>
        )}
        {kind === "file" && (
          <>
            <label className={`file-control ${fileError ? "is-invalid" : ""}`}>
              <span className="file-control-icon">
                <FileUp size={19} />
              </span>
              <span className="file-control-copy">
                <strong>
                  {item?.fileName && !staleFile
                    ? item.fileName
                    : t("attachment")}
                </strong>
                <small>
                  {t("fileAccepts")}: {formatLabelFor(type)} · {t("fileHint")}
                </small>
              </span>
              <input
                key={type}
                name="file"
                type="file"
                accept={acceptFor(type)}
                onChange={checkFile}
              />
            </label>
            {fileError && (
              <PopupNotice
                message={fileError}
                onClose={() => setFileError("")}
              />
            )}
          </>
        )}
        {staleFile && (
          <p className="form-error" role="status">
            {t("fileWillBeRemoved")}
          </p>
        )}
        {error && (
          <PopupNotice
            message={error}
            offset={fileError ? 1 : 0}
            onClose={() => setError("")}
          />
        )}
        <footer className="dialog-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={saving}
          >
            {!saving && <Plus size={16} />}
            {saving ? t("saving") : item ? t("saveChanges") : t("saveItem")}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
