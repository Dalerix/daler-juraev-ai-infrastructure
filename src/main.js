(function () {
  "use strict";

  var canvas = document.getElementById("network-canvas");
  var ctx = canvas.getContext("2d", { alpha: true });
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia("(max-width: 820px)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 1.8);
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var time = 0;
  var racks = [];
  var packets = [];

  function resize() {
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildScene();
  }

  function buildScene() {
    racks = [];
    var rows = mobile ? 8 : 14;
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < rows; i++) {
        racks.push({ side: side, depth: i / rows, seed: Math.random() * 10 });
      }
    }
    packets = [];
    for (var p = 0; p < (mobile ? 24 : 54); p++) {
      packets.push({ side: p % 2 ? -1 : 1, t: Math.random(), speed: .0015 + Math.random() * .0022, lane: Math.random() });
    }
  }

  function project(side, depth) {
    var horizon = innerHeight * .43 + pointer.y * 6;
    var nearY = innerHeight * .93;
    var ease = Math.pow(depth, 1.6);
    var y = horizon + ease * (nearY - horizon);
    var spread = innerWidth * (.055 + ease * .46);
    return { x: innerWidth / 2 + side * spread + pointer.x * (10 + ease * 8), y: y, scale: .12 + ease * 1.15 };
  }

  function drawRack(rack) {
    var p = project(rack.side, rack.depth);
    var w = 118 * p.scale;
    var h = 280 * p.scale;
    var x = p.x - w / 2;
    var y = p.y - h;
    var alpha = .16 + rack.depth * .72;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(4,12,14,.92)";
    ctx.strokeStyle = "rgba(91,210,206,.42)";
    ctx.lineWidth = Math.max(.5, p.scale);
    ctx.shadowColor = rack.side > 0 ? "#2cf6ff" : "#8d6cff";
    ctx.shadowBlur = 9 * p.scale;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    var slots = 12;
    for (var s = 0; s < slots; s++) {
      var sy = y + (s + 1) * h / (slots + 1);
      ctx.strokeStyle = "rgba(126,189,187,.23)";
      ctx.beginPath();
      ctx.moveTo(x + w * .1, sy);
      ctx.lineTo(x + w * .9, sy);
      ctx.stroke();
      if ((s + Math.floor(rack.seed * 4)) % 3 === 0) {
        var blink = .35 + .65 * Math.max(0, Math.sin(time * .003 + rack.seed + s));
        ctx.globalAlpha = alpha * blink;
        ctx.fillStyle = s % 4 ? "#b8ff3d" : "#2cf6ff";
        ctx.fillRect(x + w * .72, sy - 1.5 * p.scale, 3 * p.scale, 2 * p.scale);
      }
    }
    ctx.restore();
  }

  function drawFabric() {
    var horizonY = innerHeight * .43 + pointer.y * 6;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.globalCompositeOperation = "lighter";
    [-1, 1].forEach(function (side) {
      for (var lane = 0; lane < 3; lane++) {
        var start = project(side, 1);
        var hx = innerWidth / 2 + side * (18 + lane * 9);
        var grad = ctx.createLinearGradient(start.x, start.y, hx, horizonY);
        grad.addColorStop(0, side > 0 ? "rgba(44,246,255,.35)" : "rgba(141,108,255,.32)");
        grad.addColorStop(1, "rgba(184,255,61,.06)");
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(start.x + side * lane * 12, start.y);
        ctx.quadraticCurveTo(innerWidth / 2 + side * innerWidth * .26, innerHeight * .68, hx, horizonY);
        ctx.stroke();
      }
    });
    packets.forEach(function (packet) {
      if (!reduced) packet.t = (packet.t + packet.speed * 16) % 1;
      var depth = 1 - packet.t;
      var p = project(packet.side, depth);
      var offset = (packet.lane - .5) * 22 * p.scale;
      ctx.fillStyle = packet.side > 0 ? "#2cf6ff" : "#b8ff3d";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = .2 + packet.t * .8;
      ctx.beginPath();
      ctx.arc(p.x + offset, p.y - 10 * p.scale, Math.max(1, 2.2 * p.scale), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function draw() {
    time += 16;
    pointer.x += (pointer.tx - pointer.x) * .045;
    pointer.y += (pointer.ty - pointer.y) * .045;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    var glow = ctx.createRadialGradient(innerWidth / 2, innerHeight * .43, 0, innerWidth / 2, innerHeight * .43, innerWidth * .55);
    glow.addColorStop(0, "rgba(35,155,157,.13)");
    glow.addColorStop(.3, "rgba(15,62,73,.07)");
    glow.addColorStop(1, "rgba(3,7,8,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    racks.slice().sort(function (a, b) { return a.depth - b.depth; }).forEach(drawRack);
    drawFabric();
    if (!reduced) requestAnimationFrame(draw);
  }

  document.addEventListener("pointermove", function (event) {
    pointer.tx = event.clientX / innerWidth - .5;
    pointer.ty = event.clientY / innerHeight - .5;
    document.documentElement.style.setProperty("--mx", event.clientX + "px");
    document.documentElement.style.setProperty("--my", event.clientY + "px");
  }, { passive: true });

  document.querySelector(".explore").addEventListener("click", function () {
    document.getElementById("fabric").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });

  function clock() {
    var now = new Date();
    document.getElementById("utc").textContent = "UTC " + now.toUTCString().slice(17, 25);
  }

  function animateCounters() {
    document.querySelectorAll("[data-count]").forEach(function (node) {
      var target = Number(node.dataset.count);
      var start = performance.now();
      function tick(now) {
        var progress = Math.min(1, (now - start) / 1400);
        var eased = 1 - Math.pow(1 - progress, 4);
        node.textContent = Math.round(target * eased).toLocaleString() + (node.dataset.suffix || "");
        if (progress < 1 && !reduced) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  addEventListener("resize", resize);
  resize();
  clock();
  setInterval(clock, 1000);
  animateCounters();
  draw();

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: .12 });
  document.querySelectorAll(".reveal").forEach(function (el) { revealObserver.observe(el); });

  var tooltip = document.getElementById("node-tooltip");
  document.querySelectorAll(".node-hit").forEach(function (node) {
    function showTip() {
      var bits = node.dataset.tip.split("|");
      tooltip.innerHTML = bits[0] + "<span>" + bits[1] + "</span>";
      tooltip.style.left = node.style.getPropertyValue("--x");
      tooltip.style.top = node.style.getPropertyValue("--y");
      tooltip.classList.add("is-visible");
    }
    node.addEventListener("mouseenter", showTip);
    node.addEventListener("focus", showTip);
    node.addEventListener("mouseleave", function () { tooltip.classList.remove("is-visible"); });
    node.addEventListener("blur", function () { tooltip.classList.remove("is-visible"); });
  });

  document.querySelectorAll(".tilt-card").forEach(function (card) {
    card.addEventListener("pointermove", function (event) {
      if (mobile || reduced) return;
      var box = card.getBoundingClientRect();
      var x = (event.clientX - box.left) / box.width;
      var y = (event.clientY - box.top) / box.height;
      card.style.setProperty("--card-x", (x * 100) + "%");
      card.style.setProperty("--card-y", (y * 100) + "%");
      card.style.transform = "perspective(700px) rotateX(" + ((.5 - y) * 4) + "deg) rotateY(" + ((x - .5) * 4) + "deg)";
    });
    card.addEventListener("pointerleave", function () { card.style.transform = ""; });
  });

  var scaleSection = document.querySelector(".scale-section");
  var scaleAisle = document.querySelector(".scale-aisle");
  var scaleLines = Array.from(document.querySelectorAll(".scale-line"));
  var rackDensity = document.getElementById("rack-density");
  var scrollTicking = false;
  function updateScale() {
    var rect = scaleSection.getBoundingClientRect();
    var travel = Math.max(1, scaleSection.offsetHeight - innerHeight);
    var progress = Math.max(0, Math.min(1, -rect.top / travel));
    var step = Math.min(3, Math.floor(progress * 4));
    scaleLines.forEach(function (line, index) { line.classList.toggle("is-active", index === step); });
    document.documentElement.style.setProperty("--scale-progress", (progress * 100) + "%");
    rackDensity.textContent = Math.round(32 + progress * 68) + "%";
    if (!reduced) scaleAisle.style.transform = "scale(" + (1 + progress * .55) + ") translateY(" + (progress * 3) + "%)";
    scrollTicking = false;
  }
  addEventListener("scroll", function () {
    if (!scrollTicking) {
      requestAnimationFrame(updateScale);
      scrollTicking = true;
    }
  }, { passive: true });
  updateScale();
})();
