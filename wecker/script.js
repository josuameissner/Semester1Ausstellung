// ============================================================
// Baut die Slides aus WECKERS (siehe videos.js) und steuert das Karussell.
// ============================================================

const track = document.getElementById("track");
const viewport = document.getElementById("viewport");
const dotsWrap = document.getElementById("dots");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let currentIndex = 0;
const IMAGE_SLIDE_DURATION = 30000;
let autoAdvanceTimer = null;
const youtubePlayers = new Map();

function mediaLabel(item) {
  return item.type === "youtube" ? "Short" : "Bild";
}

function youtubeIdFromUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  const directIdMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directIdMatch) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (parsed.pathname.includes("/shorts/")) {
      return parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    }
    return parsed.searchParams.get("v") || "";
  } catch (err) {
    return "";
  }
}

function addMissingMediaNote(grid, wecker) {
  if (grid.children.length) return;
  const note = document.createElement("div");
  note.className = "media-missing";
  note.textContent = `Medium fuer ${wecker.title} fehlt`;
  grid.appendChild(note);
}

function createMediaElement(item, grid, wecker) {
  if (item.type === "youtube" && !youtubeIdFromUrl(item.src)) {
    return null;
  }

  const figure = document.createElement("figure");
  figure.className = `media-item media-item--${item.type}`;
  if (item.layout) figure.classList.add(`media-item--${item.layout}`);
  if (item.background) figure.classList.add(`media-item--background-${item.background}`);
  if (item.aspect) figure.style.setProperty("--short-aspect", item.aspect);

  const media = item.type === "youtube"
    ? document.createElement("iframe")
    : document.createElement("img");

  media.setAttribute("aria-label", mediaLabel(item));

  if (item.type === "youtube") {
    const youtubeId = youtubeIdFromUrl(item.src);
    media.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;
    media.title = item.title || "YouTube Short";
    media.allow = "autoplay; encrypted-media; picture-in-picture";
    media.allowFullscreen = true;
    media.addEventListener("load", () => {
      viewport.scrollLeft = 0;
      centerActiveSlide();
    });
  } else {
    media.src = item.src;
    media.alt = item.alt || mediaLabel(item);
  }

  media.addEventListener("error", () => {
    figure.remove();
    addMissingMediaNote(grid, wecker);
  });
  figure.appendChild(media);
  return figure;
}

function buildSlide(wecker) {
  const slide = document.createElement("div");
  slide.className = "slide";
  const students = wecker.students || [];
  const personalTitle = wecker.title.match(/^Wecker für (.+)$/);
  const titleLabel = personalTitle ? "Wecker für" : "Titel";
  const titleText = personalTitle ? personalTitle[1] : wecker.title;
  const studentsBlock = students.length
    ? `<div class="slide__info-row"><strong>Studierende:</strong><br>${students.join("<br>")}</div>`
    : "";

  slide.innerHTML = `
    <div class="slide__stage">
      <div class="slide__info">
        <div class="slide__info-row"><strong>${titleLabel}:</strong><br>${titleText}</div>
        ${studentsBlock}
      </div>
      <div class="slide__media-wrap">
        <div class="media-grid"></div>
      </div>
    </div>`;

  const grid = slide.querySelector(".media-grid");
  (wecker.media || []).forEach((item) => {
    const mediaElement = createMediaElement(item, grid, wecker);
    if (mediaElement) grid.appendChild(mediaElement);
  });
  if ((wecker.media || []).length > 1) grid.classList.add("media-grid--multi");
  addMissingMediaNote(grid, wecker);
  return slide;
}

function buildDot(index) {
  const dot = document.createElement("button");
  dot.className = "dot";
  dot.setAttribute("aria-label", `Zu Wecker ${index + 1}`);
  dot.addEventListener("click", () => goTo(index));
  return dot;
}

function render() {
  WECKERS.forEach((wecker, index) => {
    track.appendChild(buildSlide(wecker));
    dotsWrap.appendChild(buildDot(index));
  });
}

function updateActiveStates() {
  [...track.children].forEach((slide, index) => {
    const isActive = index === currentIndex;
    slide.classList.toggle("is-active", isActive);
    slide.querySelectorAll("iframe").forEach((iframe) => {
      iframe.style.pointerEvents = isActive ? "" : "none";
    });
  });
  [...dotsWrap.children].forEach((dot, index) => dot.classList.toggle("is-active", index === currentIndex));
}

function activeSlide() {
  return track.children[currentIndex] || null;
}

function startActiveSlide() {
  clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = null;

  const slide = activeSlide();
  if (!slide) return;

  const activeIframe = slide.querySelector("iframe");

  youtubePlayers.forEach((player, iframe) => {
    try {
      if (iframe === activeIframe) {
        player.mute();
        player.seekTo(0, true);
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch (err) {
      // Der YouTube-Player ist noch nicht bereit und startet in onReady.
    }
  });

  if (!activeIframe) {
    autoAdvanceTimer = setTimeout(next, IMAGE_SLIDE_DURATION);
  }
}

function setupYouTubePlayers() {
  track.querySelectorAll("iframe").forEach((iframe) => {
    if (youtubePlayers.has(iframe)) return;

    const player = new YT.Player(iframe, {
      events: {
        onReady(event) {
          if (iframe.closest(".slide") === activeSlide()) {
            event.target.mute();
            event.target.seekTo(0, true);
            event.target.playVideo();
          } else {
            event.target.pauseVideo();
          }
        },
        onStateChange(event) {
          const isActiveVideo = iframe.closest(".slide") === activeSlide();
          if (isActiveVideo && event.data === YT.PlayerState.ENDED) next();
        }
      }
    });

    youtubePlayers.set(iframe, player);
  });
}

function loadYouTubeApi() {
  if (!track.querySelector("iframe")) return;

  if (window.YT && window.YT.Player) {
    setupYouTubePlayers();
    return;
  }

  const previousReadyHandler = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (typeof previousReadyHandler === "function") previousReadyHandler();
    setupYouTubePlayers();
  };

  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const apiScript = document.createElement("script");
    apiScript.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(apiScript);
  }
}

function fitMediaFrames() {
  track.querySelectorAll(".media-grid").forEach((grid) => {
    const items = [...grid.querySelectorAll(".media-item")];
    if (!items.length) return;

    if (grid.classList.contains("media-grid--multi")) {
      items.forEach((item) => {
        item.style.width = "";
        item.style.height = "";
      });
      return;
    }

    items.forEach((item) => {
      const customAspect = item.style.getPropertyValue("--short-aspect");
      const shortAspectRatio = customAspect
        ? customAspect.split("/").map((value) => Number(value.trim())).reduce((width, height) => width / height)
        : 9 / 16;
      const aspectRatio = item.classList.contains("media-item--background-wide")
        ? 16 / 9
        : item.classList.contains("media-item--youtube")
          ? shortAspectRatio
          : 16 / 9;
      const width = Math.min(grid.clientWidth, grid.clientHeight * aspectRatio);
      item.style.width = `${width}px`;
      item.style.height = `${width / aspectRatio}px`;
    });
  });
}

function centerActiveSlide() {
  viewport.scrollLeft = 0;
  fitMediaFrames();
  const activeSlide = track.children[currentIndex];
  if (!activeSlide) return;
  const viewportCenter = viewport.clientWidth / 2;
  const slideCenter = activeSlide.offsetLeft + activeSlide.offsetWidth / 2;
  track.style.transform = `translateX(${viewportCenter - slideCenter}px)`;
}

function goTo(index) {
  currentIndex = ((index % WECKERS.length) + WECKERS.length) % WECKERS.length;
  updateActiveStates();
  centerActiveSlide();
  startActiveSlide();
}

function next() { goTo(currentIndex + 1); }
function prev() { goTo(currentIndex - 1); }

prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") next();
  if (event.key === "ArrowLeft") prev();
});

let touchStartX = null;
viewport.addEventListener("touchstart", (event) => { touchStartX = event.touches[0].clientX; }, { passive: true });
viewport.addEventListener("touchend", (event) => {
  if (touchStartX === null) return;
  const deltaX = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(deltaX) > 50) deltaX < 0 ? next() : prev();
  touchStartX = null;
});

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(centerActiveSlide, 100);
});

(function init() {
  render();
  track.style.transition = "none";
  centerActiveSlide();
  requestAnimationFrame(() => requestAnimationFrame(() => { track.style.transition = ""; }));
  updateActiveStates();
  startActiveSlide();
  loadYouTubeApi();
})();
