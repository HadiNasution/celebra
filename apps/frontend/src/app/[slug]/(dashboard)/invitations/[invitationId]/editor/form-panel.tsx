"use client";

type SchemaValue = Record<string, unknown> | string | number | boolean | null | undefined;

type FormPanelProps = {
  schema: SchemaValue;
  content: Record<string, unknown>;
  onChange: (path: string[], value: unknown) => void;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-primary/50";

export function FormPanel({ schema, content, onChange }: FormPanelProps) {
  return (
    <div className="space-y-6 p-4">
      {Object.entries(schema as Record<string, unknown>).map(([key, value]) => (
        <SchemaNode key={key} path={[key]} schema={value} value={content[key]} onChange={onChange} />
      ))}
    </div>
  );
}

function SchemaNode({
  path,
  schema,
  value,
  onChange,
}: {
  path: string[];
  schema: unknown;
  value: unknown;
  onChange: (path: string[], value: unknown) => void;
}) {
  if (isField(schema)) {
    return (
      <FieldRenderer
        path={path}
        meta={schema as Record<string, unknown>}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) return null;

  const label = (schema as Record<string, unknown>).label as string | undefined;
  const children = Object.entries(schema as Record<string, unknown>).filter(
    ([k]) => k !== "label",
  );

  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
        {label ?? path[path.length - 1]}
      </legend>
      <div className="space-y-4">
        {children.map(([key, child]) => (
          <SchemaNode
            key={key}
            path={[...path, key]}
            schema={child}
            value={get(value, key)}
            onChange={onChange}
          />
        ))}
      </div>
    </fieldset>
  );
}

function FieldRenderer({
  path,
  meta,
  value,
  onChange,
}: {
  path: string[];
  meta: Record<string, unknown>;
  value: unknown;
  onChange: (path: string[], value: unknown) => void;
}) {
  const label = (meta.label as string) ?? path[path.length - 1];
  const type = (meta.type as string) ?? "text";
  const placeholder = (meta.placeholder as string) ?? "";
  const field = path[path.length - 1];

  switch (type) {
    case "textarea":
      return (
        <Label label={label} field={field}>
          <textarea
            rows={4}
            className={inputClass}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(path, e.target.value)}
          />
        </Label>
      );
    case "date":
      return (
        <Label label={label} field={field}>
          <input
            type="date"
            className={inputClass}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(path, e.target.value)}
          />
        </Label>
      );
    case "color":
      return (
        <Label label={label} field={field}>
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5"
            value={(value as string) ?? "#000000"}
            onChange={(e) => onChange(path, e.target.value)}
          />
        </Label>
      );
    case "number":
      return (
        <Label label={label} field={field}>
          <input
            type="number"
            className={inputClass}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(path, Number(e.target.value))}
          />
        </Label>
      );
    case "image":
      return (
        <Label label={label} field={field}>
          <input
            type="url"
            className={inputClass}
            placeholder={placeholder || "https://cdn.example.com/image.webp"}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(path, e.target.value)}
          />
          {typeof value === "string" && value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={label}
              className="mt-2 h-24 w-full rounded-lg object-cover"
            />
          )}
        </Label>
      );
    case "gallery":
      return (
        <GalleryField path={path} label={label} value={value} onChange={onChange} />
      );
    case "map":
      return (
        <MapField path={path} label={label} value={value} onChange={onChange} />
      );
    default:
      return (
        <Label label={label} field={field}>
          <input
            type="text"
            className={inputClass}
            placeholder={placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(path, e.target.value)}
          />
        </Label>
      );
  }
}

function GalleryField({
  path,
  label,
  value,
  onChange,
}: {
  path: string[];
  label: string;
  value: unknown;
  onChange: (path: string[], value: unknown) => void;
}) {
  const items = Array.isArray(value) ? (value as string[]) : [];
  const field = path[path.length - 1];

  return (
    <Label label={label} field={field}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="url"
              className={inputClass}
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(path, next);
              }}
            />
            <button
              type="button"
              onClick={() => onChange(path, items.filter((_, j) => j !== i))}
              className="shrink-0 rounded-lg border border-red-400/40 px-2 py-1 text-xs text-red-400 hover:bg-red-400/10"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange(path, [...items, ""])}
          className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/5"
        >
          + Add image URL
        </button>
      </div>
    </Label>
  );
}

function MapField({
  path,
  label,
  value,
  onChange,
}: {
  path: string[];
  label: string;
  value: unknown;
  onChange: (path: string[], value: unknown) => void;
}) {
  const map = (value && typeof value === "object" ? value : { lat: 0, lng: 0 }) as Record<
    string,
    number
  >;

  return (
    <Label label={label} field={path[path.length - 1]}>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-text-secondary">
          Latitude
          <input
            type="number"
            step="any"
            className={inputClass}
            value={map.lat}
            onChange={(e) => onChange(path, { lat: Number(e.target.value), lng: map.lng })}
          />
        </label>
        <label className="text-xs text-text-secondary">
          Longitude
          <input
            type="number"
            step="any"
            className={inputClass}
            value={map.lng}
            onChange={(e) => onChange(path, { lat: map.lat, lng: Number(e.target.value) })}
          />
        </label>
      </div>
    </Label>
  );
}

function Label({
  label,
  field,
  children,
}: {
  label: string;
  field: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={`field-${field}`} className="block text-sm font-medium">
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function isField(schema: unknown): boolean {
  return (
    !!schema &&
    typeof schema === "object" &&
    !Array.isArray(schema) &&
    typeof (schema as Record<string, unknown>).type === "string"
  );
}

function get(obj: unknown, key: string): unknown {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;
}
