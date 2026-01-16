

const textInput = document.getElementById("textInput");
const wordEl = document.getElementById("word");
const focusBox = document.getElementById("focus-box");
const pivotLine = document.getElementById("pivot");

const playPauseBtn = document.getElementById("playPause");
const stopBtn = document.getElementById("stop");
const pivotToggle = document.getElementById("pivotToggle");

const chunkToggle = document.getElementById("chunkToggle");
const biasLabel = document.getElementById("biasLabel");
const biasButtons = document.querySelectorAll(".pivot-bias button");

const wpmSlider = document.getElementById("wpm");
const wpmVal = document.getElementById("wpmVal");


let units = [];
let index = 0;
let running = false;
let timer = null;


let pivotBias = 0;        // -1, 0, +1
let chunkEnabled = true;


wpmVal.textContent = wpmSlider.value;
wpmSlider.oninput = () => (wpmVal.textContent = wpmSlider.value);

document.addEventListener("keydown", e => {
  // Space = play / pause
  if (e.code === "Space") {
    if (document.activeElement === textInput && !textInput.readOnly) return;
    e.preventDefault();
    togglePlayPause();
  }


  if (e.code === "ArrowLeft") {
    e.preventDefault();
    if (running) togglePlayPause();
    step(-1);
  }
  if (e.code === "ArrowRight") {
    e.preventDefault();
    if (running) togglePlayPause();
    step(1);
  }
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


chunkToggle.onchange = () => {
  chunkEnabled = chunkToggle.checked;
  index = 0;
  parseText();
  if (!running) draw();
};


biasButtons.forEach(btn => {
  btn.onclick = () => {
    pivotBias += Number(btn.dataset.bias);
    pivotBias = Math.max(-1, Math.min(1, pivotBias));

    biasLabel.textContent =
      pivotBias === 0 ? "Default" : pivotBias < 0 ? "Earlier" : "Later";

    if (!running) draw();
  };
});


const SEED_CHUNKS = new Set([
  "in the", "of the", "to the", "for the", "on the",
  "as well", "there is", "there are",
  "for example", "such as", "because of", "in order",
  "according to", "at least", "going to", "at one", "one of",
  "part of", "due to", "in fact", "in case", "by the",
  "in which", "so that", "as soon", "be able",
  "the end", "the same", "the way", "some of",
  "a lot", "lots of", "kind of", "sort of", "a little",
  "as if", "as to", "as for", "as to", "in time",
  "in place", "on time", "on place", "by far",
  "by then", "up to", "out of", "due to", "ahead of", "close to", "was a", "is a",
  "it is", "it was", "that is", "that was", "there was", "he was", "she was"
]);

function isChunkCandidate(a, b) {
  if (!chunkEnabled) return false;
  if (/[.!?,;:]$/.test(a)) return false;
  if (a.length > 8 || b.length > 8) return false;
  return SEED_CHUNKS.has((a + " " + b).toLowerCase());
}


function parseText() {
  units = [];

  const text = textInput.value;
  const regex = /\S+/g;
  const tokens = [];
  let m;

  while ((m = regex.exec(text)) !== null) {
    tokens.push({
      word: m[0],
      start: m.index,
      end: m.index + m[0].length
    });
  }

  let i = 0;
  while (i < tokens.length) {
    if (
      i + 1 < tokens.length &&
      isChunkCandidate(tokens[i].word, tokens[i + 1].word)
    ) {
      units.push(makeUnit(tokens.slice(i, i + 2)));
      i += 2;
    } else {
      units.push(makeUnit([tokens[i]]));
      i += 1;
    }
  }
}

function makeUnit(tokens) {
  const text = tokens.map(t => t.word).join(" ");
  const span = [tokens[0].start, tokens[tokens.length - 1].end];

  let pivotWordIndex = 0;
  let maxLen = 0;

  tokens.forEach((t, i) => {
    const clean = t.word.replace(/\W/g, "");
    if (clean.length > maxLen) {
      maxLen = clean.length;
      pivotWordIndex = i;
    }
  });

  return { text, span, pivotWordIndex };
}


function basePivotIndex(word) {
  if (word.length <= 1) return 0;
  if (word.length <= 5) return 1;
  if (word.length <= 9) return 2;
  return 3;
}


function highlight(unit) {
  textInput.focus();
  textInput.setSelectionRange(unit.span[0], unit.span[1]);
}

function draw() {
  const unit = units[index];
  if (!unit) return;

  highlight(unit);

  const words = unit.text.split(" ");
  const pivotWord = words[unit.pivotWordIndex];
  const clean = pivotWord.replace(/\W/g, "");

  let p = basePivotIndex(clean) + pivotBias;
  p = Math.max(0, Math.min(clean.length - 1, p));

  let before = words.slice(0, unit.pivotWordIndex).join(" ");
  if (before) before += " ";

  const pre = clean.slice(0, p);
  const mid = clean[p] || "";
  const post = clean.slice(p + 1);

  let after = words.slice(unit.pivotWordIndex + 1).join(" ");
  if (after) after = " " + after;

  wordEl.innerHTML =
    `<span>${before}${pre}</span>` +
    `<span class="pivot">${mid}</span>` +
    `<span>${post}${after}</span>`;

  wordEl.style.fontSize = "90px";
  requestAnimationFrame(alignAndScale);
}

function alignAndScale() {
  const mid = wordEl.querySelector(".pivot");
  if (!mid) return;

  const pivotX = focusBox.clientWidth / 2;
  const midCenter = mid.offsetLeft + mid.offsetWidth / 2;

  wordEl.style.left = (pivotX - midCenter) + "px";

  let size = 90;
  while (wordEl.scrollWidth > focusBox.clientWidth - 40 && size > 40) {
    size -= 2;
    wordEl.style.fontSize = size + "px";
  }
}


function pacingMultiplier(text) {
  let m = 1;

  if (/[.!?]$/.test(text)) m *= 2.4;
  else if (/[,:;]$/.test(text)) m *= 1.6;

  const letters = text.replace(/\W/g, "").length;
  if (letters >= 10) m *= 1.35;
  else if (letters >= 7) m *= 1.2;

  return m;
}


function togglePlayPause() {
  if (!running) {
    if (!units.length || index === 0) parseText();
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

function loop() {
  if (!running) return;

  if (index >= units.length) {
    running = false;
    textInput.readOnly = false;
    playPauseBtn.textContent = "▶";
    return;
  }

  draw();

  let delay = 60000 / wpmSlider.value;
  delay *= pacingMultiplier(units[index].text);

  index++;
  timer = setTimeout(loop, delay);
}



function step(dir) {
  if (!units.length) return;
  index = Math.max(0, Math.min(units.length - 1, index + dir));
  draw();
}
// mobile
focusBox.addEventListener("click", () => {
  if (document.activeElement === textInput && !textInput.readOnly) return;
  togglePlayPause();
});

