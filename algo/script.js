// ============================================================
// Baut die Slides aus VIDEOS (siehe videos.js) und den Namen aus
// studierende.txt und steuert das Karussell.
// ============================================================

const track = document.getElementById("track");
const viewport = document.getElementById("viewport");
const dotsWrap = document.getElementById("dots");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let currentIndex = 0;
let players = [];
let isRendered = false;
let isYouTubeApiReady = false;

async function loadStudents() {
  const studentsByKey = {};
  try {
    const res = await fetch("studierende.txt");
    const text = await res.text();
    let currentKey = null;

    text.split("\n").forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) return;

      const headerMatch = line.match(/^\[(.+)\]$/);
      if (headerMatch) {
        currentKey = headerMatch[1].trim();
        studentsByKey[currentKey] = [];
      } else if (currentKey) {
        studentsByKey[currentKey].push(line);
      }
    });
  } catch (err) {
    console.warn("studierende.txt konnte nicht geladen werden:", err);
  }
  return studentsByKey;
}

function playerId(video) {
  return `youtube-player-${video.key.replace(/[^a-z0-9]/gi, "-")}`;
}

function buildSlide(video, students) {
  const slide = document.createElement("div");
  slide.className = "slide";
  const studentsBlock = students.length
    ? `<div class="slide__info-row"><strong>Studierende:</strong><br>${students.join("<br>")}</div>`
    : "";

  slide.innerHTML = `
    <div class="slide__stage">
      <div class="slide__info">
        <div class="slide__info-row"><strong>Titel:</strong><br>${video.title}</div>
        ${studentsBlock}
      </div>
      <div class="slide__video-wrap">
        <div class="youtube-player" id="${playerId(video)}"></div>
      </div>
    </div>`;
  return slide;
}

function buildDot(index) {
  const dot = document.createElement("button");
  dot.className = "dot";
  dot.setAttribute("aria-label", `Zu Video ${index + 1}`);
  dot.addEventListener("click", () => goTo(index));
  return dot;
}

function render(studentsByKey) {
  VIDEOS.forEach((video, index) => {
    track.appendChild(buildSlide(video, studentsByKey[video.key] || []));
    dotsWrap.appendChild(buildDot(index));
  });
  isRendered = true;
}

function createPlayers() {
  if (!isRendered || !isYouTubeApiReady || players.length) return;

  players = VIDEOS.map((video, index) => {
    if (!video.youtube) return null;
    return new YT.Player(playerId(video), {
      videoId: video.youtube,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        mute: 1,
        playsinline: 1,
        rel: 0
      },
      events: {
        onReady: (event) => {
          event.target.mute();
          if (index === currentIndex) {
            playActiveVideo();
          } else {
            event.target.pauseVideo();
          }
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.ENDED && index === currentIndex) next();
        }
      }
    });
  });
}

function playActiveVideo() {
  const player = players[currentIndex];
  if (!player || typeof player.playVideo !== "function") return;
  player.mute();
  player.seekTo(0, true);
  player.playVideo();
}

function updateActiveStates() {
  [...track.children].forEach((slide, index) => {
    const isActive = index === currentIndex;
    slide.classList.toggle("is-active", isActive);
    const player = players[index];
    if (player && !isActive && typeof player.pauseVideo === "function") player.pauseVideo();
  });
  playActiveVideo();
  [...dotsWrap.children].forEach((dot, index) => dot.classList.toggle("is-active", index === currentIndex));
}

function centerActiveSlide() {
  fitPlayerFrames();
  const activeSlide = track.children[currentIndex];
  if (!activeSlide) return;
  const viewportCenter = viewport.clientWidth / 2;
  const slideCenter = activeSlide.offsetLeft + activeSlide.offsetWidth / 2;
  track.style.transform = `translateX(${viewportCenter - slideCenter}px)`;
}

function fitPlayerFrames() {
  const aspectRatio = 16 / 9;
  track.querySelectorAll(".slide__video-wrap").forEach((wrap) => {
    const player = wrap.querySelector(".youtube-player");
    if (!player) return;

    const width = Math.min(wrap.clientWidth, wrap.clientHeight * aspectRatio);
    player.style.width = `${width}px`;
    player.style.height = `${width / aspectRatio}px`;
  });
}

function goTo(index) {
  currentIndex = ((index % VIDEOS.length) + VIDEOS.length) % VIDEOS.length;
  updateActiveStates();
  centerActiveSlide();
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

window.onYouTubeIframeAPIReady = () => {
  isYouTubeApiReady = true;
  createPlayers();
  updateActiveStates();
};

(async function init() {
  const studentsByKey = await loadStudents();
  render(studentsByKey);
  track.style.transition = "none";
  centerActiveSlide();
  requestAnimationFrame(() => requestAnimationFrame(() => { track.style.transition = ""; }));

  if (window.YT && window.YT.Player) isYouTubeApiReady = true;
  createPlayers();
  updateActiveStates();
})();
