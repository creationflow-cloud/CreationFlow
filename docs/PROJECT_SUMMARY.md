# CreationFlow – Projektzusammenfassung

Stand: 27.05.2026

## 1. Projektziel

CreationFlow ist eine self-hosted Plattform für Produktkonfiguration, Web-to-Print und automatisierte Druck-Workflows.

Das Ziel ist ein offener, modularer Core, mit dem Produkte online personalisiert, regelbasiert geprüft und anschließend automatisch als druckfertige Dateien gerendert werden können.

Typische Anwendungsfälle:

- personalisierte Merchandise-Produkte
- Vereins-/Shop-Produkte mit Namen, Nummern, Logos oder Motiven
- WooCommerce-Produktkonfigurator
- automatische PDF-Erzeugung für Druck/Produktion
- rule-based Layout- und Produktionslogik
- self-hosted Alternative zu geschlossenen Web-to-Print-Systemen

---

## 2. Grundidee

CreationFlow besteht aus einem offenen Core-Monorepo und optionalen Adaptern/Integrationen.

Der Core enthält:

- API
- Admin UI
- Editor
- Renderer
- Worker
- Schema-/Core-Logik
- Rules Engine
- PDF Engine
- WooCommerce/WordPress Adapter als geplanter Connector

Die Plattform soll zunächst lokal/self-hosted funktionieren und später optional als Cloud-/SaaS-Variante oder mit kommerziellen Modulen erweitert werden können.

---

## 3. Lizenzmodell

Das Core-Repository ist als öffentlicher Open-Core unter **AGPL-3.0** geplant bzw. angelegt.

### Warum AGPL-3.0?

Die AGPL passt gut zu CreationFlow, weil das Projekt primär serverseitig/self-hosted genutzt wird. Wenn jemand den Core verändert und als Netzwerkdienst betreibt, soll der geänderte Quellcode ebenfalls verfügbar gemacht werden müssen.

Ziele:

- offene Basis schützen
- Forks und Verbesserungen zurück in die Community fördern
- verhindern, dass jemand den Core nimmt, verändert und als geschlossenen SaaS-Dienst betreibt
- trotzdem spätere kommerzielle Add-ons ermöglichen

### Mögliche spätere Struktur

- `creationflow-core`: AGPL-3.0
- `creationflow-cloud`: proprietär oder kommerziell
- `creationflow-enterprise`: kommerzielle Zusatzmodule
- `woocommerce-plugin`: vermutlich GPL-2.0-or-later oder GPL-compatible, passend zum WordPress/WooCommerce-Ökosystem
- optionale Dual-License-Strategie für Kunden, die AGPL nicht nutzen möchten

Wichtig: Der WooCommerce/WordPress-Adapter sollte lizenztechnisch separat betrachtet werden, da WordPress-Plugins üblicherweise GPL-kompatibel sein sollten.

---

## 4. Monorepo-Struktur

Geplante bzw. bereits angelegte Struktur:

```txt
apps/
  api/          Fastify API
  admin/        Admin UI
  editor/       React/Vite 2D Editor
  renderer/     Rendering/PDF Service
  worker/       Background Worker

packages/
  schema/       Gemeinsames JSON-Dokumentmodell und Typen
  core/         Gemeinsame Core-Logik
  rules-engine/ Regel- und Dependency-Engine
  pdf-engine/   Print-ready PDF-Erzeugung
  ui/           Gemeinsame UI-Komponenten

adapters/
  woocommerce-plugin/ WordPress/WooCommerce Connector

deploy/
  docker/       Docker Compose Setup
```

Package Manager: `pnpm` Workspace  
Sprache: TypeScript  
Backend: Fastify  
Frontend: React/Vite  
Datenbank: PostgreSQL mit Prisma

---

## 5. Aktueller technischer Stand

### Bereits vorhanden

- Monorepo-Grundstruktur
- Fastify API
- Prisma/PostgreSQL-Anbindung
- Datenmodell für:
    - Workspace
    - Product
    - Template
    - Configuration
    - RenderJob
    - Asset
- OpenAPI/Swagger unter:
    - `/docs`
    - `/openapi.json`
- Admin UI kann Daten laden
- Admin UI kann Produkte, Templates und Konfigurationen anlegen
- Admin UI kann Template-Seiten und Surfaces bearbeiten
- Editor kann Templates/Konfigurationen öffnen
- Editor kann Elemente hinzufügen:
    - Text
    - Shape
    - Image
- Editor unterstützt:
    - Verschieben
    - Skalieren
    - Löschen
    - Duplizieren
    - Layer-Reihenfolge
    - Z-Index
    - Undo/Redo
    - Speichern
- Asset Upload für Bilder ist vorhanden
- hochgeladene Assets können wieder ausgeliefert werden
- zentrales JSON-Dokumentmodell ist typisiert
- PDF Engine erzeugt aktuell einen Render-Plan
- erste Render-/Surface-/Elementlogik ist vorbereitet

### Noch offen / Platzhalter

- echte PDF-Erzeugung
- Rules Engine
- Renderer-Service
- Worker-Logik
- Produktionslogik
- WooCommerce-Adapter
- finale Template-/Surface-Workflows
- Druckdaten-Export mit Beschnitt, Sicherheitsabstand, DPI, Fonts, Farbprofilen usw.

---

## 6. Zentrales Datenmodell

CreationFlow basiert auf einem dokumentbasierten Template-/Configuration-Modell.

### Grundstruktur

```txt
Workspace
  Product
    Template
      Page
        Surface
          Element
    Configuration
      Document
        Page
          Surface
            Element
```

### Workspace

Ein Workspace ist der Mandanten-/Projektkontext.

Beispiele:

- ein Shop
- ein Kunde
- ein Verein
- eine Agentur
- ein interner Testbereich

### Product

Ein Produkt beschreibt das konfigurierbare Produkt.

Beispiele:

- T-Shirt
- Hoodie
- Tasse
- Poster
- Schild
- Vereinsartikel

Ein Produkt kann ein oder mehrere Templates haben.

### Template

Ein Template ist die technische/gestalterische Vorlage eines Produkts.

Es enthält:

- Seiten
- Surfaces
- Standardelemente
- Druckbereiche
- optionale Regeln
- Metadaten

### Page

Eine Page beschreibt eine logische Seite oder Ansicht.

Beispiele:

- Vorderseite
- Rückseite
- Ärmel
- Etikett
- Druckbogen

### Surface

Eine Surface beschreibt einen bearbeitbaren oder druckrelevanten Bereich auf einer Page.

Mögliche Rollen:

- `designRegion`
- `colorRegion`
- `overlay`
- weitere spätere Rollen möglich

Surfaces können Rechtecke oder perspektivisch später komplexere Pfade sein.

Wichtige Anforderungen:

- sichtbarer Bereich im Editor
- technische Druckfläche
- Clipping/Maskierung
- spätere SVG-/Path-basierte Flächen
- Layering gegenüber Elementen

### Element

Elemente sind die eigentlichen Inhalte im Editor.

Typen:

- Text
- Shape
- Image

Wichtige Properties:

- Position
- Größe
- Rotation
- Z-Index
- Inhalt
- Styling
- Asset-Referenzen
- Surface-Zuordnung

### Configuration

Eine Configuration ist die konkrete Benutzerkonfiguration eines Templates.

Beispiel:

Ein Kunde öffnet ein Hoodie-Template und fügt Namen, Nummer und Logo hinzu. Diese konkrete Variante wird als Configuration gespeichert.

---

## 7. API

Die API basiert auf Fastify.

Aktuell vorhanden:

- Datenbankanbindung
- Workspace-Endpunkte
- Product-Endpunkte
- Template-Endpunkte
- Configuration-Endpunkte
- RenderJob-Endpunkte
- Asset-Endpunkte
- OpenAPI/Swagger-Dokumentation
- CORS-Konfiguration
- Seed-Script für Demo-Daten
- JSON-Schema-Fixes für das Dokumentmodell

Wichtige API-Ziele:

- Admin UI mit Daten versorgen
- Editor-Konfigurationen laden/speichern
- Assets hochladen und ausliefern
- Render-Jobs anlegen
- Worker/Renderer später anbinden
- WooCommerce-Plugin anbinden

---

## 8. Admin UI

Die Admin UI ist die Verwaltungsoberfläche für Produkte, Templates und Konfigurationen.

Aktueller Stand:

- Daten werden aus der API geladen
- Produkte können angelegt werden
- Templates können angelegt werden
- Konfigurationen können angelegt werden
- Template-Seiten können bearbeitet werden
- Surfaces können bearbeitet werden
- Surface-Verwaltung ist im Aufbau

Nächste sinnvolle Schritte:

- Surfaces sauber löschen können
- Surface-Reihenfolge bearbeiten
- Surface-Rollen bearbeiten
- SVG-Import für Surfaces
- Template-Vorschau verbessern
- Produkt-/Template-Detailseiten verbessern
- Admin-Navigation ausbauen
- Validierung und Fehlermeldungen verbessern

---

## 9. Editor

Der Editor ist eine React/Vite-basierte 2D-Bearbeitungsoberfläche.

Aktueller Stand:

Der Editor kann eine Configuration oder ein Template laden und visuell bearbeiten.

Vorhandene Funktionen:

- Template/Configuration öffnen
- Text-Element hinzufügen
- Shape-Element hinzufügen
- Image-Element hinzufügen
- Elemente verschieben
- Elemente skalieren
- Elemente löschen
- Elemente duplizieren
- Layer-Reihenfolge ändern
- Z-Index bearbeiten
- Undo/Redo
- Speichern
- Asset Upload für Bilder
- Rendering der Elemente im Canvas
- einfache Surface-Darstellung

Wichtige Editor-Konzepte:

- Elemente gehören zu einer Surface
- Surfaces definieren bearbeitbare oder druckbare Bereiche
- Layering erfolgt über `zIndex`
- Bearbeitung erfolgt auf dem JSON-Dokumentmodell
- Core-Operationen sollten möglichst über `@creationflow/core` laufen

Nächste sinnvolle Editor-Themen:

- bessere Surface-Auswahl
- Surface-Clipping
- Path/SVG-Surface-Unterstützung
- Snap/Guides
- Text-Properties erweitern
- Font Handling
- Bild-Cropping
- Bild-DPI-Warnungen
- sichere Druckbereichsanzeige
- mobile/responsive Editor-Ansicht später

---

## 10. Renderer und PDF Engine

Der Renderer ist für die technische Ausgabe zuständig.

Aktueller Stand:

- PDF Engine erzeugt aktuell nur einen Render-Plan
- echte PDF-Erzeugung ist noch nicht umgesetzt
- Renderer-App ist größtenteils Platzhalter
- Worker ist größtenteils Platzhalter

Ziel:

Aus einer gespeicherten Configuration soll ein druckfertiges PDF erzeugt werden.

Benötigte Funktionen:

- JSON-Dokument lesen
- Seiten und Surfaces auflösen
- Elemente layouten
- Text rendern
- Bilder rendern
- Shapes rendern
- SVG-/Path-Flächen berücksichtigen
- Clipping/Maskierung
- Z-Index-Reihenfolge
- Beschnitt
- Sicherheitsabstände
- Ausgabeformat
- DPI-Prüfung
- Font Embedding
- Farbmanagement später
- PDF/X optional später
- Warnungen/Preflight ausgeben

Mögliche spätere Render-Ausgaben:

- Preview PNG/JPEG
- druckfertiges PDF
- Produktions-PDF
- Kundenvorschau
- Thumbnail
- Proof-Datei

---

## 11. Rules Engine

Die Rules Engine ist geplant, aber aktuell noch nicht vollständig umgesetzt.

Zweck:

- Produktlogik abbilden
- Abhängigkeiten zwischen Optionen definieren
- Layoutregeln erzwingen
- Pflichtfelder prüfen
- Variantenlogik auswerten
- Produktionsregeln ausgeben

Beispiele:

- Wenn Farbe = Schwarz, dann Standardtextfarbe = Weiß
- Wenn Produktgröße = XL, dann anderer Druckbereich
- Wenn Logo hochgeladen, dann Mindestauflösung prüfen
- Text darf Surface nicht verlassen
- bestimmtes Element ist Pflicht
- Variante bestimmt Template oder Surface
- WooCommerce-Variation bestimmt erlaubte Optionen

---

## 12. Worker

Der Worker soll Hintergrundjobs ausführen.

Geplante Aufgaben:

- RenderJobs abarbeiten
- PDF-Erzeugung starten
- Thumbnails erzeugen
- Assets optimieren
- Preflight-Prüfung
- WooCommerce-Bestellung verarbeiten
- Benachrichtigungen/Webhooks auslösen
- Fehlerstatus speichern

Aktueller Stand:

- Struktur vorhanden
- Logik noch größtenteils Platzhalter

---

## 13. WordPress/WooCommerce Integration

Ein wichtiger geplanter Adapter ist ein WordPress/WooCommerce Plugin.

Ziel:

WooCommerce-Produkte sollen mit CreationFlow-Templates verbunden werden können.

### Geplante Plugin-Aufgaben

Im WordPress/WooCommerce Backend:

- CreationFlow API URL hinterlegen
- API Token hinterlegen
- WooCommerce-Produkte mit CreationFlow-Produkten/Templates verbinden
- Produktvarianten mit Template-Optionen verbinden
- Konfigurator im Produkt anzeigen
- Konfiguration mit Warenkorbposition speichern
- Configuration ID in Cart/Order Meta speichern
- RenderJob nach Bestellung auslösen
- fertige PDF-/Preview-Dateien im Auftrag verlinken
- Produktionsdaten an Shop/Admin übergeben

### Frontend-Verhalten

Auf der WooCommerce-Produktseite:

- Button oder eingebetteter Editor
- Kunde personalisiert Produkt
- Configuration wird in CreationFlow gespeichert
- WooCommerce Cart Item enthält Referenz auf die Configuration
- Bestellung enthält Configuration ID
- nach Bestellung wird ein RenderJob erzeugt

### Technische Optionen

Mögliche Integration:

1. Embedded iframe
   WooCommerce lädt den CreationFlow Editor per iframe.

2. Headless API Integration
   WordPress baut eigene UI und spricht direkt mit CreationFlow API.

3. Hybrid
   Editor kommt aus CreationFlow, Produkt-/Cart-/Order-Logik aus WooCommerce.

Für MVP ist iframe/hybrid vermutlich am sinnvollsten.

### Wichtige WooCommerce-Daten

- Product ID
- Variation ID
- Cart Item Meta
- Order Item Meta
- Customer Data
- Configuration ID
- RenderJob ID
- Preview URL
- Production PDF URL

### Lizenz-Hinweis

Der WordPress/WooCommerce Adapter sollte wahrscheinlich separat und GPL-kompatibel lizenziert werden, auch wenn der Core AGPL-3.0 bleibt.

---

## 14. Asset Handling

Aktuell vorhanden:

- Upload von Bildassets
- Speicherung in API/Backend
- Auslieferung hochgeladener Dateien
- Nutzung im Editor

Geplante Erweiterungen:

- Asset-Metadaten
- MIME-Type-Prüfung
- Dateigrößenlimit
- Bildauflösung prüfen
- DPI berechnen
- Bildoptimierung
- Thumbnail-Erzeugung
- Asset-Verknüpfung mit Workspace/Product/Configuration
- Löschlogik
- Zugriffsschutz

---

## 15. Template-/Surface-Workflow

CreationFlow soll Templates möglichst flexibel abbilden können.

Aktuell:

- Template-Seiten und Surfaces existieren
- Surfaces können im Admin bearbeitet werden
- Editor rendert Surface-basierte Inhalte

Geplante Richtung:

- SVG-Import für Templates/Surfaces
- Path-basierte Surfaces
- Rollen je Surface
- Vorschau im Admin
- Surface-Reihenfolge
- Surface löschen
- Surface duplizieren
- Surface als Designbereich, Farbbereich oder Overlay nutzen
- Surface-Hintergrund und Stroke im Editor darstellen
- später ggf. Mockups mit Produktbildern

---

## 16. Wichtige technische Prinzipien

### 1. Schema-first

Das zentrale JSON-Dokumentmodell ist die Grundlage für API, Admin, Editor, Renderer und Worker.

### 2. Core-Operationen zentralisieren

Editor-Operationen wie Element hinzufügen, löschen, duplizieren, Layer ändern usw. sollten möglichst in `@creationflow/core` liegen, nicht verstreut in UI-Komponenten.

### 3. API und OpenAPI aktuell halten

Alle relevanten API-Endpunkte sollten sauber typisiert und über Swagger/OpenAPI dokumentiert sein.

### 4. Self-hosted first

Das System soll lokal, per Docker und auf eigenen Servern laufen können.

### 5. Print-ready als Ziel, Preview zuerst

Für MVP reicht zunächst ein stabiler visueller Editor und Preview/Render-Plan. Druckfertige PDF-Erzeugung kommt danach schrittweise.

### 6. Modularität

WooCommerce, Renderer, Worker und Rules Engine sollen austauschbar bzw. modular bleiben.

---

## 17. Aktuelle Prioritäten

Sinnvolle nächste Meilensteine:

### Kurzfristig

1. Admin: Surfaces löschen können
2. Admin: Surface-Verwaltung stabilisieren
3. Editor: Surface-/Element-Handling weiter härten
4. API: fehlende CRUD-Endpunkte ergänzen
5. PDF Engine: vom Render-Plan zur ersten echten PDF-Ausgabe
6. Asset-Handling verbessern
7. erste manuelle End-to-End-Demo stabilisieren

### Danach

1. SVG-Importer für Surfaces
2. Path-basierte Surface-Darstellung im Editor
3. Surface-Clipping im Editor
4. PDF-Rendering für Text/Shape/Image
5. RenderJob → Worker → PDF-Ausgabe
6. WooCommerce MVP Plugin
7. Rules Engine MVP

### Später

1. Produktoptionen
2. Variantenlogik
3. Preflight
4. Font Management
5. Benutzer/Rollen/Rechte
6. Mandantenfähigkeit ausbauen
7. Cloud-/Enterprise-Funktionen
8. Lizenz-/Subscription-Modell

---

## 18. MVP-Ziel

Ein realistisches MVP wäre:

1. Admin legt Produkt und Template an
2. Admin definiert Seiten und Surfaces
3. Editor öffnet eine Configuration
4. Benutzer fügt Text/Bild/Shape hinzu
5. Benutzer speichert Configuration
6. API speichert Dokumentmodell
7. RenderJob wird erstellt
8. Worker verarbeitet RenderJob
9. PDF Engine erzeugt eine einfache PDF
10. WooCommerce kann später diese Configuration mit einer Bestellung verbinden

---

## 19. Beispiel-Workflow später

```txt
WooCommerce Product Page
  -> Kunde öffnet Konfigurator
  -> CreationFlow Editor lädt Template
  -> Kunde personalisiert Produkt
  -> Configuration wird gespeichert
  -> Kunde legt Produkt in Warenkorb
  -> WooCommerce speichert Configuration ID
  -> Bestellung wird abgeschlossen
  -> WooCommerce Plugin erzeugt RenderJob
  -> Worker rendert PDF
  -> PDF wird am Auftrag gespeichert
  -> Produktion kann Datei herunterladen
```

---

## 20. Projektcharakter

CreationFlow ist keine reine Design-App, sondern eine technische Web-to-Print- und Produktionsplattform.

Der Editor ist nur ein Teil des Systems.

Die eigentliche Stärke soll aus der Kombination entstehen:

- strukturiertes Produktmodell
- Template-/Surface-System
- Konfigurationsdaten
- Regeln
- automatisches Rendering
- WooCommerce-Anbindung
- self-hosted Betrieb
- offene Core-Lizenz

---

## Ultrakurze Codex-Kontextversion

CreationFlow ist ein self-hosted AGPL-3.0 Open-Core Monorepo für Produktkonfiguration, Web-to-Print und automatisierte Druckdaten-Erzeugung. Stack: TypeScript, pnpm Workspace, Fastify API, Prisma/PostgreSQL, React/Vite Admin und Editor. Das zentrale Modell besteht aus Workspaces, Products, Templates, Pages, Surfaces, Elements, Configurations, RenderJobs und Assets. Admin kann aktuell Daten laden, Produkte/Templates/Konfigurationen anlegen und Template-Seiten/Surfaces bearbeiten. Der Editor kann Konfigurationen/Templates öffnen, Text-/Shape-/Image-Elemente hinzufügen, verschieben, skalieren, löschen, duplizieren, Layer/Z-Index ändern, Undo/Redo und Speichern. Asset Upload funktioniert. OpenAPI/Swagger ist unter /docs und /openapi.json vorhanden. PDF Engine erzeugt aktuell nur einen Render-Plan; echte PDF-Erzeugung, Rules Engine, Renderer, Worker und WooCommerce Plugin sind noch weitgehend offen. Ziel ist später ein WooCommerce/WordPress Adapter, der Produkte mit CreationFlow-Templates verbindet, den Editor einbettet, Configuration IDs in Warenkorb/Bestellung speichert und nach Bestellung RenderJobs für druckfertige PDFs erzeugt.
