(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setupReveal() {
    const items = document.querySelectorAll(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("reveal--in"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal--in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach((item) => observer.observe(item));
  }

  function setupTabs() {
    const tabs = document.querySelectorAll("[data-game-tab]");
    const panels = document.querySelectorAll("[data-game-panel]");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.gameTab;
        tabs.forEach((item) => {
          const isActive = item === tab;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-selected", String(isActive));
        });
        panels.forEach((panel) => {
          const isActive = panel.dataset.gamePanel === target;
          panel.classList.toggle("is-active", isActive);
          panel.hidden = !isActive;
        });
      });
    });
  }

  function setupChunkRush() {
    const canvas = document.getElementById("chunk-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("chunk-score");
    const livesEl = document.getElementById("chunk-lives");
    const bestEl = document.getElementById("chunk-best");
    const start = document.getElementById("chunk-start");
    const reset = document.getElementById("chunk-reset");
    const buttons = document.querySelectorAll("[data-chunk-move]");
    const keys = new Set();
    let best = 0;
    let frame = 0;
    let lastTime = 0;
    let state = newRun();

    function newRun() {
      return {
        running: false,
        over: false,
        score: 0,
        lives: 3,
        spawn: 0,
        speed: 112,
        player: { x: 166, y: 394, w: 28, h: 30 },
        drops: []
      };
    }

    function startRun() {
      state = newRun();
      state.running = true;
      state.over = false;
      lastTime = performance.now();
      updateHud();
      requestAnimationFrame(loop);
    }

    function resetRun() {
      state = newRun();
      updateHud();
      drawIntro();
    }

    function updateHud() {
      scoreEl.textContent = String(state.score);
      livesEl.textContent = String(state.lives);
      bestEl.textContent = String(best);
    }

    function spawnDrop() {
      const roll = Math.random();
      const type = roll < 0.62 ? "lava" : roll < 0.86 ? "emerald" : "ice";
      state.drops.push({
        x: Math.floor(Math.random() * (canvas.width - 28)),
        y: -36,
        size: type === "ice" ? 24 : 28,
        type,
        vy: state.speed + Math.random() * 62
      });
    }

    function rectsTouch(a, b) {
      return a.x < b.x + b.size && a.x + a.w > b.x && a.y < b.y + b.size && a.y + a.h > b.y;
    }

    function loop(now) {
      if (!state.running) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      update(dt);
      draw();
      frame = requestAnimationFrame(loop);
    }

    function update(dt) {
      const left = keys.has("ArrowLeft") || keys.has("a") || keys.has("A");
      const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D");
      const move = (right ? 1 : 0) - (left ? 1 : 0);
      state.player.x += move * 230 * dt;
      state.player.x = Math.max(8, Math.min(canvas.width - state.player.w - 8, state.player.x));

      state.spawn -= dt;
      state.speed += 5 * dt;
      if (state.spawn <= 0) {
        spawnDrop();
        state.spawn = Math.max(0.34, 0.92 - state.score * 0.012);
      }

      state.drops.forEach((drop) => {
        drop.y += drop.vy * dt;
      });

      for (let i = state.drops.length - 1; i >= 0; i -= 1) {
        const drop = state.drops[i];
        if (rectsTouch(state.player, drop)) {
          if (drop.type === "emerald") {
            state.score += 5;
          } else if (drop.type === "ice") {
            state.score += 2;
            state.speed = Math.max(100, state.speed - 18);
          } else {
            state.lives -= 1;
          }
          state.drops.splice(i, 1);
          continue;
        }
        if (drop.y > canvas.height + 40) {
          if (drop.type === "emerald") state.score = Math.max(0, state.score - 1);
          state.drops.splice(i, 1);
        }
      }

      state.score += dt * 0.8;
      state.score = Math.floor(state.score);
      if (state.lives <= 0) {
        state.running = false;
        state.over = true;
        best = Math.max(best, state.score);
        cancelAnimationFrame(frame);
      }
      updateHud();
    }

    function drawBlock(x, y, w, h, fill, top) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = top;
      ctx.fillRect(x, y, w, Math.max(4, h * 0.22));
      ctx.strokeStyle = "rgba(0,0,0,.42)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }

    function drawScene() {
      ctx.fillStyle = "#0d130f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(218,233,198,.06)";
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      for (let x = 0; x < canvas.width; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      drawBlock(0, canvas.height - 28, canvas.width, 28, "#5a4228", "#68bd55");
    }

    function draw() {
      drawScene();
      state.drops.forEach((drop) => {
        if (drop.type === "lava") drawBlock(drop.x, drop.y, drop.size, drop.size, "#d33b24", "#ffd363");
        if (drop.type === "emerald") drawBlock(drop.x, drop.y, drop.size, drop.size, "#33c978", "#a8ff9b");
        if (drop.type === "ice") drawBlock(drop.x, drop.y, drop.size, drop.size, "#4bb9de", "#d7fbff");
      });
      drawBlock(state.player.x, state.player.y, state.player.w, state.player.h, "#2c7f46", "#9cff8f");
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.fillRect(state.player.x + 7, state.player.y + 9, 4, 4);
      ctx.fillRect(state.player.x + 18, state.player.y + 9, 4, 4);

      if (state.over) {
        ctx.fillStyle = "rgba(5,7,5,.76)";
        ctx.fillRect(36, 164, canvas.width - 72, 116);
        ctx.fillStyle = "#f4f7ed";
        ctx.font = "900 26px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Run ended", canvas.width / 2, 210);
        ctx.font = "800 15px system-ui";
        ctx.fillText("Score " + state.score, canvas.width / 2, 240);
      }
    }

    function drawIntro() {
      drawScene();
      ctx.fillStyle = "#f4f7ed";
      ctx.textAlign = "center";
      ctx.font = "900 28px system-ui";
      ctx.fillText("Chunk Rush", canvas.width / 2, 205);
      ctx.font = "750 15px system-ui";
      ctx.fillStyle = "#b7c0a8";
      ctx.fillText("Start a run when ready", canvas.width / 2, 235);
    }

    window.addEventListener("keydown", (event) => keys.add(event.key));
    window.addEventListener("keyup", (event) => keys.delete(event.key));

    buttons.forEach((button) => {
      const key = button.dataset.chunkMove === "left" ? "ArrowLeft" : "ArrowRight";
      button.addEventListener("pointerdown", () => keys.add(key));
      button.addEventListener("pointerup", () => keys.delete(key));
      button.addEventListener("pointerleave", () => keys.delete(key));
      button.addEventListener("pointercancel", () => keys.delete(key));
    });

    start.addEventListener("click", startRun);
    reset.addEventListener("click", resetRun);
    updateHud();
    drawIntro();
  }

  function setupRedstoneRecall() {
    const pads = Array.from(document.querySelectorAll("[data-red-pad]"));
    if (!pads.length) return;

    const levelEl = document.getElementById("redstone-level");
    const streakEl = document.getElementById("redstone-streak");
    const statusEl = document.getElementById("redstone-status");
    const start = document.getElementById("redstone-start");
    const reset = document.getElementById("redstone-reset");
    let sequence = [];
    let index = 0;
    let accepting = false;
    let streak = 0;

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function setStatus(text) {
      statusEl.textContent = text;
    }

    function updateHud() {
      levelEl.textContent = String(sequence.length);
      streakEl.textContent = String(streak);
    }

    async function flashPad(id) {
      const pad = pads[id];
      pad.classList.add("is-lit");
      await wait(360);
      pad.classList.remove("is-lit");
      await wait(130);
    }

    async function playSequence() {
      accepting = false;
      setStatus("Watch");
      await wait(350);
      for (const id of sequence) {
        await flashPad(id);
      }
      index = 0;
      accepting = true;
      setStatus("Repeat");
    }

    function nextRound() {
      sequence.push(Math.floor(Math.random() * pads.length));
      updateHud();
      playSequence();
    }

    function startGame() {
      sequence = [];
      streak = 0;
      updateHud();
      nextRound();
    }

    function resetGame() {
      sequence = [];
      index = 0;
      streak = 0;
      accepting = false;
      setStatus("Ready");
      updateHud();
      pads.forEach((pad) => pad.classList.remove("is-lit"));
    }

    pads.forEach((pad) => {
      pad.addEventListener("click", () => {
        if (!accepting) return;
        const id = Number(pad.dataset.redPad);
        flashPad(id);
        if (sequence[index] !== id) {
          accepting = false;
          setStatus("Missed");
          streak = 0;
          updateHud();
          return;
        }
        index += 1;
        if (index >= sequence.length) {
          accepting = false;
          streak += 1;
          setStatus("Clean");
          updateHud();
          setTimeout(nextRound, 650);
        }
      });
    });

    start.addEventListener("click", startGame);
    reset.addEventListener("click", resetGame);
    updateHud();
  }

  function setupOreSweep() {
    const grid = document.getElementById("ore-grid");
    if (!grid) return;

    const targetEl = document.getElementById("ore-target");
    const scoreEl = document.getElementById("ore-score");
    const timeEl = document.getElementById("ore-time");
    const bestEl = document.getElementById("ore-best");
    const start = document.getElementById("ore-start");
    const reset = document.getElementById("ore-reset");
    const ores = [
      { name: "Iron", code: "Fe", cls: "ore-iron" },
      { name: "Copper", code: "Cu", cls: "ore-copper" },
      { name: "Gold", code: "Au", cls: "ore-gold" },
      { name: "Diamond", code: "Di", cls: "ore-diamond" },
      { name: "Coal", code: "Co", cls: "ore-coal" }
    ];
    let running = false;
    let target = ores[0];
    let score = 0;
    let time = 30;
    let best = 0;
    let timer = null;

    function randomOre() {
      return ores[Math.floor(Math.random() * ores.length)];
    }

    function updateHud() {
      scoreEl.textContent = String(score);
      timeEl.textContent = String(time);
      bestEl.textContent = String(best);
      targetEl.textContent = target.name;
    }

    function fillGrid() {
      grid.innerHTML = "";
      const targetSlot = Math.floor(Math.random() * 25);
      for (let i = 0; i < 25; i += 1) {
        const ore = i === targetSlot ? target : randomOre();
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ore-cell " + ore.cls;
        button.textContent = ore.code;
        button.setAttribute("aria-label", ore.name + " ore");
        button.dataset.ore = ore.name;
        grid.appendChild(button);
      }
    }

    function setTarget() {
      target = randomOre();
      updateHud();
      fillGrid();
    }

    function stopGame() {
      running = false;
      clearInterval(timer);
      timer = null;
      best = Math.max(best, score);
      updateHud();
    }

    function startGame() {
      running = true;
      score = 0;
      time = 30;
      setTarget();
      clearInterval(timer);
      timer = setInterval(() => {
        if (!running) return;
        time -= 1;
        if (time <= 0) {
          time = 0;
          stopGame();
        }
        updateHud();
      }, 1000);
    }

    function resetGame() {
      stopGame();
      score = 0;
      time = 30;
      target = ores[0];
      updateHud();
      fillGrid();
    }

    grid.addEventListener("click", (event) => {
      const cell = event.target.closest(".ore-cell");
      if (!cell || !running) return;
      if (cell.dataset.ore === target.name) {
        score += 1;
        time = Math.min(60, time + 2);
      } else {
        time = Math.max(0, time - 2);
      }
      if (time <= 0) stopGame();
      setTarget();
    });

    start.addEventListener("click", startGame);
    reset.addEventListener("click", resetGame);
    updateHud();
    fillGrid();
  }

  setupReveal();
  setupTabs();
  setupChunkRush();
  setupRedstoneRecall();
  setupOreSweep();
})();
