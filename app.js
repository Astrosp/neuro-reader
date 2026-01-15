const textInput = document.getElementById("textInput");
const wordEl = document.getElementById("word");
const focusBox = document.getElementById("focus-box");
const pivotLine = document.getElementById("pivot");

const playPauseBtn = document.getElementById("playPause");
const stopBtn = document.getElementById("stop");
const pivotToggle = document.getElementById("pivotToggle");

const wpmSlider = document.getElementById("wpm");
const wpmVal = document.getElementById("wpmVal");

let words = [];
let positions = [];
let index = 0;
let running = false;
let timer = null;

wpmVal.textContent = wpmSlider.value;
wpmSlider.oninput = () => wpmVal.textContent = wpmSlider.value;

document.addEventListener("keydown", e => {
  if (e.code !== "Space") return;
  if (document.activeElement === textInput && !textInput.readOnly) return;
  e.preventDefault();
  togglePlayPause();
});

playPauseBtn.onclick = togglePlayPause;

stopBtn.onclick = () => {
  running = false;
  clearTimeout(timer);
  index = 0;
  textInput.readOnly = false;
  playPauseBtn.textContent = "▶";
};

pivotToggle.onchange = () => {
  pivotLine.classList.toggle("hidden", !pivotToggle.checked);
};

function parseText() {
  words = [];
  positions = [];

  const text = textInput.value;
  const regex = /\S+/g;
  let m;

  while ((m = regex.exec(text)) !== null) {
    words.push(m[0]);
    positions.push([m.index, m.index + m[0].length]);
  }
}

function pivotIndex(word) {
  if (word.length <= 1) return 0;
  if (word.length <= 5) return 1;
  if (word.length <= 9) return 2;
  return 3;
}

function highlight(i) {
  const p = positions[i];
  if (!p) return;
  textInput.focus();
  textInput.setSelectionRange(p[0], p[1]);
  scrollHighlightIntoView();
}

function scrollHighlightIntoView() {
  const ta = textInput;
  const before = ta.value.slice(0, ta.selectionStart);
  const lines = before.split("\n");
  const line = lines.length - 1;
  const lineHeight = 20;
  const center = ta.clientHeight / 2;
  ta.scrollTop = line * lineHeight - center;
}

function draw() {
  if (!words[index]) return;

  highlight(index);

  const raw = words[index].replace(/^[\W_]+|[\W_]+$/g, "");
  const p = pivotIndex(raw);
  const pre = raw.slice(0, p);
  const mid = raw[p] || "";
  const post = raw.slice(p + 1);

  wordEl.innerHTML =
    `<span>${pre}</span><span class="pivot">${mid}</span><span>${post}</span>`;

  wordEl.style.fontSize = "96px";

  requestAnimationFrame(alignAndScale);
}

function alignAndScale() {
  const mid = wordEl.querySelector(".pivot");
  if (!mid) return;

  const boxWidth = focusBox.clientWidth;
  const pivotX = boxWidth / 2;
  const midCenter = mid.offsetLeft + mid.offsetWidth / 2;

  wordEl.style.left = (pivotX - midCenter) + "px";

  let size = 96;
  while (wordEl.scrollWidth > boxWidth - 40 && size > 40) {
    size -= 2;
    wordEl.style.fontSize = size + "px";
  }
}

function togglePlayPause() {
  if (!running) {
    if (!words.length || index === 0) parseText();
    running = true;
    textInput.readOnly = true;
    playPauseBtn.textContent = "⏸";
    loop();
  } else {
    running = false;
    clearTimeout(timer);
    playPauseBtn.textContent = "▶";
  }
}

function punctuationDelay(word) {
  if (/[.!?]$/.test(word)) return 2.4;
  if (/[,:;]$/.test(word)) return 1.6;
  return 1;
}

function loop() {
  if (!running) return;
  if (index >= words.length) {
    running = false;
    textInput.readOnly = false;
    playPauseBtn.textContent = "▶";
    return;
  }

  draw();

  let delay = 60000 / wpmSlider.value;
  delay *= punctuationDelay(words[index]);

  index++;
  timer = setTimeout(loop, delay);
}
