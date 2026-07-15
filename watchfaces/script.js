// ============================================================
// Baut die Slides aus PROJECTS (siehe data.js) und steuert das
// Karussell: Pfeile, Tastatur, Swipe, Punkte-Navigation, Autoplay.
// ============================================================

// Wie viele Sekunden ein Slide gezeigt wird, bevor automatisch
// zum nächsten gewechselt wird. Einfach hier ändern.
const AUTOPLAY_SECONDS = 10;

const track = document.getElementById("track");
const viewport = document.getElementById("viewport");
const dotsWrap = document.getElementById("dots");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let currentIndex = 0;

function buildSlide(project) {
  const slide = document.createElement("div");
  slide.className = "slide";

  const groupBlock = project.group
    ? `<div class="slide__info-row"><strong>Gruppenname:</strong><br>${project.group}</div>`
    : "";

  slide.innerHTML = `
    <div class="slide__stage">
      <div class="slide__info">
        <div class="slide__info-row"><strong>Projektname:</strong><br>${project.title}</div>
        ${groupBlock}
        <div class="slide__info-row"><strong>Studierende:</strong><br>${project.students.join("<br>")}</div>
      </div>

      <div class="slide__watch">
        <div class="slide__canvas-wrap">
          <iframe src="projekte/${project.folder}/index.html"
                  loading="lazy"
                  title="${project.title}"></iframe>
        </div>
        <img class="slide__watch-frame" src="assets/watch-frame.png" alt="" aria-hidden="true">
      </div>
    </div>
  `;

  // Generische Zentrierung: viele Projekt-Codes haben einen zu kleinen
  // Canvas oder Standard-Rand um den Inhalt. Wir zwingen html/body im
  // Iframe dazu, den Inhalt (egal wie groß) mittig zu zeigen, sobald
  // die Projektseite geladen ist. Funktioniert nur, weil alle Projekte
  // von derselben Origin (lokal) geladen werden.
  const iframe = slide.querySelector("iframe");
  iframe.addEventListener("load", () => {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const style = doc.createElement("style");
      style.textContent = `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      `;
      doc.head.appendChild(style);
    } catch (err) {
      // Falls das mal nicht klappt (z.B. Cross-Origin), einfach ignorieren.
    }
  });

  return slide;
}

function buildDot(index) {
  const dot = document.createElement("button");
  dot.className = "dot";
  dot.setAttribute("aria-label", `Zu Projekt ${index + 1}`);
  dot.addEventListener("click", () => { goTo(index); restartAutoplay(); });
  return dot;
}

function render() {
  PROJECTS.forEach((project) => {
    track.appendChild(buildSlide(project));
    dotsWrap.appendChild(buildDot(dotsWrap.children.length));
  });
}

function updateActiveStates() {
  [...track.children].forEach((slide, i) => {
    slide.classList.toggle("is-active", i === currentIndex);
  });
  [...dotsWrap.children].forEach((dot, i) => {
    dot.classList.toggle("is-active", i === currentIndex);
  });
}

function centerActiveSlide() {
  const activeSlide = track.children[currentIndex];
  if (!activeSlide) return;
  const viewportCenter = viewport.clientWidth / 2;
  const slideCenter = activeSlide.offsetLeft + activeSlide.offsetWidth / 2;
  track.style.transform = `translateX(${viewportCenter - slideCenter}px)`;
}

function updateIframeScale() {
  [...track.children].forEach((slide) => {
    const wrap = slide.querySelector(".slide__canvas-wrap");
    const iframe = slide.querySelector("iframe");
    // "cover"-Verhalten: an die größere der beiden Seiten anpassen,
    // damit nie eine Lücke sichtbar wird (Überstand wird von
    // overflow:hidden auf .slide__canvas-wrap abgeschnitten).
    const scale = Math.max(wrap.clientWidth / 960, wrap.clientHeight / 960);
    iframe.style.transform = `scale(${scale})`;
  });
}

function goTo(index) {
  const len = PROJECTS.length;
  currentIndex = ((index % len) + len) % len;
  updateActiveStates();
  centerActiveSlide();
}

function next() { goTo(currentIndex + 1); }
function prev() { goTo(currentIndex - 1); }

// ---- Autoplay ----

let autoplayTimer = null;

function startAutoplay() {
  stopAutoplay();
  autoplayTimer = setInterval(next, AUTOPLAY_SECONDS * 1000);
}

function stopAutoplay() {
  if (autoplayTimer) clearInterval(autoplayTimer);
}

// Jede manuelle Interaktion setzt den Autoplay-Timer neu,
// damit nicht kurz nach dem Klicken schon wieder gewechselt wird.
function restartAutoplay() {
  startAutoplay();
}

// ---- Events ----

prevBtn.addEventListener("click", () => { prev(); restartAutoplay(); });
nextBtn.addEventListener("click", () => { next(); restartAutoplay(); });

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { next(); restartAutoplay(); }
  if (e.key === "ArrowLeft") { prev(); restartAutoplay(); }
});

let touchStartX = null;
viewport.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

viewport.addEventListener("touchend", (e) => {
  if (touchStartX === null) return;
  const deltaX = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(deltaX) > 50) {
    deltaX < 0 ? next() : prev();
    restartAutoplay();
  }
  touchStartX = null;
});

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    centerActiveSlide();
    updateIframeScale();
  }, 100);
});

// ---- Init ----

render();
updateActiveStates();

// Erstes Zentrieren ohne Animation, danach Transition wieder aktivieren
track.style.transition = "none";
centerActiveSlide();
updateIframeScale();
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    track.style.transition = "";
  });
});

startAutoplay();