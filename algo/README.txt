VIDEO-WEBSITE
=============

Die Website spielt die Videos über die YouTube IFrame API ab.

Videos eintragen
----------------
Öffne videos.js und trage bei jedem Eintrag die YouTube-Video-ID ein:

  youtube: "euRb8FCB2R8"

Die ID ist der Teil nach youtu.be/ bzw. nach watch?v= in einer YouTube-URL.

Beispiel:
  https://youtu.be/euRb8FCB2R8
                   ^^^^^^^^^^^

Verhalten
---------
- Das aktive Video startet stumm automatisch.
- YouTube-Bedienelemente werden ausgeblendet.
- Nach dem Ende eines Videos wechselt das Karussell zum nächsten Slide.
- Beim Slide-Wechsel werden andere Videos pausiert und das neue Video beginnt von vorn.

Dateien
-------
index.html       HTML-Struktur und Einbindung der YouTube IFrame API
videos.js        Titel, Zuordnung und YouTube-IDs
script.js        Karussell- und YouTube-Player-Steuerung
style.css        Layout und Darstellung
studierende.txt  Namen der Studierenden je Video
