// ============================================================
// build-data.js
// ------------------------------------------------------------
// Scannt /projekte/ und baut daraus automatisch data.js.
//
// Erwartete Struktur pro Ordner in /projekte/:
//   projekte/<foldername>/
//     index.html                     -> der Algorithmus (960x960)
//     <Gruppenname>-<Name1,Name2>.txt -> Metadaten, NUR im Dateinamen
//
// Beispiel-Dateiname:
//   "Rund um die Uhr-Jeremy,Franziska,Josua.txt"
//   -> Gruppenname:   "Rund um die Uhr"
//   -> Studierende:   ["Jeremy", "Franziska", "Josua"]
//
// Der Projekt-Titel (oben auf der Slide) wird aus dem Ordnernamen
// gebildet ("cell-devision-code" -> "Cell Devision Code").
// Kursname und Betreuende sind unten als Konstanten hinterlegt,
// falls sie sich mal ändern.
//
// AUSFÜHREN:  node build-data.js
// (nach jeder Änderung an /projekte/ einmal neu ausführen)
// ============================================================

const fs = require("fs");
const path = require("path");

const PROJECTS_DIR = path.join(__dirname, "projekte");
const OUTPUT_FILE = path.join(__dirname, "data.js");

// Kursname und Betreuende stehen jetzt direkt (statisch) in script.js,
// da sie für jedes Projekt gleich sind. Hier also nicht mehr gepflegt.

// Falls ein Ordnername (z.B. wegen Umlauten, siehe Hinweis unten)
// nicht 1:1 zum gewünschten Anzeige-Titel passt, hier eintragen:
const TITLE_OVERRIDES = {
  "fluessigkeit": "Flüssigkeit",
};

// Hinweis: Ordnernamen bewusst ohne Umlaute/Sonderzeichen halten
// (ü, ö, ä, ß) — manche lokalen Server/Dateisysteme kommen damit
// nicht zuverlässig klar. Für die Anzeige einfach hier oben den
// "schönen" Titel eintragen, der Ordnername selbst bleibt ASCII.

function titleFromFolder(folder) {
  if (TITLE_OVERRIDES[folder]) return TITLE_OVERRIDES[folder];
  return folder
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseMetaFilename(filename) {
  const base = filename.replace(/\.txt$/i, "");
  const sepIndex = base.indexOf("-");

  if (sepIndex === -1) {
    // Kein Minus gefunden -> alles als Gruppenname, keine Studierenden
    return { group: base.trim(), students: [] };
  }

  const group = base.slice(0, sepIndex).trim();
  const studentsPart = base.slice(sepIndex + 1).trim();
  const students = studentsPart
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return { group, students };
}

function buildProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    throw new Error(`Ordner nicht gefunden: ${PROJECTS_DIR}`);
  }

  const folders = fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "de"));

  const projects = folders.map((folder) => {
    const folderPath = path.join(PROJECTS_DIR, folder);
    const files = fs.readdirSync(folderPath);
    const txtFiles = files.filter((f) => f.toLowerCase().endsWith(".txt"));

    if (txtFiles.length === 0) {
      console.warn(`⚠️  Kein .txt in "${folder}" gefunden — Gruppenname/Studierende bleiben leer.`);
    } else if (txtFiles.length > 1) {
      console.warn(`⚠️  Mehrere .txt-Dateien in "${folder}" gefunden — nehme "${txtFiles[0]}".`);
    }

    const meta = txtFiles.length
      ? parseMetaFilename(txtFiles[0])
      : { group: "", students: [] };

    return {
      folder,
      title: titleFromFolder(folder),
      group: meta.group,
      students: meta.students,
    };
  });

  return projects;
}

function writeDataFile(projects) {
  const json = JSON.stringify(projects, null, 2);
  const content =
`// ============================================================
// AUTOMATISCH GENERIERT von build-data.js — nicht von Hand editieren!
// Änderungen bitte in /projekte/ vornehmen (Ordnernamen, .txt-Dateien)
// und danach: node build-data.js
// ============================================================

const PROJECTS = ${json};
`;
  fs.writeFileSync(OUTPUT_FILE, content, "utf8");
}

const projects = buildProjects();
writeDataFile(projects);
console.log(`✅ data.js aktualisiert mit ${projects.length} Projekt(en).`);