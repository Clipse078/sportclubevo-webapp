type Props = { title?: string };

const DEFAULT_MESSAGE =
  "Anliegen & Meldungen ist in dieser Umgebung noch nicht aktiviert. Die Datenbank-Migration und Berechtigungssynchronisation müssen erst angewendet werden.";

export default function ClubMeldungSchemaUnavailable({
  title = "Modul vorübergehend nicht verfügbar",
}: Props) {
  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="alert"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{DEFAULT_MESSAGE}</p>
    </div>
  );
}