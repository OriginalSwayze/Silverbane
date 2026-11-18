/* ==========================================================================
   SILVERBANE — main window script.
   Three small, self-healing effects; everything degrades to plain CSS if
   this script never runs (html.mr-js gates the JS-only styles).
     1. Navigator pill that glides between Store / Library / Community / You
     2. Cursor light on the islands (--mr-mx / --mr-my)
     3. 3D tilt + glare on library covers (--mr-rx / --mr-ry / --mr-gx / --mr-gy)
   ========================================================================== */
(function () {
    "use strict";
    if (window.__silverbane) return;
    window.__silverbane = true;

    const root = document.documentElement;
    root.classList.add("mr-js");

    const motion = () => {
        const v = parseFloat(getComputedStyle(root).getPropertyValue("--mr-motion"));
        return isNaN(v) ? 1 : v;
    };
    const flag = (name) => getComputedStyle(root).getPropertyValue(name).trim();

    /* ---- 1. Navigator indicator ---------------------------------------- */
    let indicator = null;
    let lastKey = "";

    function placeIndicator(force) {
        const nav = document.querySelector(".SuperNav");
        if (!nav) return;
        if (!indicator || !nav.contains(indicator)) {
            indicator = document.createElement("div");
            indicator.className = "mr-nav-indicator";
            nav.insertBefore(indicator, nav.firstChild);
            force = true;
        }
        const sel = nav.querySelector(".SuperNavMenu.Selected > .MenuButton");
        if (!sel) { indicator.style.opacity = "0"; return; }
        const n = nav.getBoundingClientRect();
        const r = sel.getBoundingClientRect();
        const x = r.left - n.left;
        const key = Math.round(x) + ":" + Math.round(r.width);
        if (!force && key === lastKey) return;
        const first = lastKey === "";
        lastKey = key;
        if (first) indicator.style.transition = "none";
        indicator.style.opacity = "1";
        indicator.style.top = (r.top - n.top) + "px";
        indicator.style.height = r.height + "px";
        indicator.style.width = r.width + "px";
        indicator.style.transform = "translateX(" + x + "px)";
        if (first) requestAnimationFrame(() => { indicator.style.transition = ""; });
    }

    /* ---- 2. Cursor light ---------------------------------------------- */
    const ISLANDS = ".MainPanel, .Library > .Container > div:not(.MainPanel)";
    let pending = null;
    let lastIsland = null;

    function onMove(e) {
        pending = e;
        if (onMove.raf) return;
        onMove.raf = requestAnimationFrame(() => {
            onMove.raf = 0;
            const ev = pending;
            if (!ev || !ev.target || !ev.target.closest) return;

            if (flag("--mr-cursor-light") !== "off") {
                const island = ev.target.closest(ISLANDS);
                if (lastIsland && lastIsland !== island) {
                    lastIsland.style.removeProperty("--mr-mx");
                    lastIsland.style.removeProperty("--mr-my");
                }
                if (island) {
                    const r = island.getBoundingClientRect();
                    island.style.setProperty("--mr-mx", (ev.clientX - r.left) + "px");
                    island.style.setProperty("--mr-my", (ev.clientY - r.top) + "px");
                }
                lastIsland = island;
            }

            /* ---- 3. Cover tilt ------------------------------------- */
            const box = ev.target.closest(".LibraryItemBox");
            if (tilted && tilted !== box) resetTilt(tilted);
            if (box && motion() > 0 && flag("--mr-tilt") !== "off") {
                const r = box.getBoundingClientRect();
                const px = (ev.clientX - r.left) / r.width;   // 0..1
                const py = (ev.clientY - r.top) / r.height;
                box.style.setProperty("--mr-ry", ((px - 0.5) * 14).toFixed(2));
                box.style.setProperty("--mr-rx", ((0.5 - py) * 14).toFixed(2));
                box.style.setProperty("--mr-gx", (px * 100).toFixed(1) + "%");
                box.style.setProperty("--mr-gy", (py * 100).toFixed(1) + "%");
                tilted = box;
            }
        });
    }
    let tilted = null;
    function resetTilt(el) {
        ["--mr-rx", "--mr-ry", "--mr-gx", "--mr-gy"].forEach((p) => el.style.removeProperty(p));
        if (tilted === el) tilted = null;
    }

    /* ---- 4. HUD readout next to the menus (clock + link status) ------- */
    function pad(n) { return String(n).padStart(2, "0"); }
    function placeHud() {
        const bar = document.querySelector(".RootMenuBar");
        if (!bar || flag("--od-hud") === "off") return;
        let hud = bar.parentElement.querySelector(":scope > .od-hud");
        if (!hud) {
            hud = document.createElement("div");
            hud.className = "od-hud";
            bar.after(hud);
        }
        const d = new Date(), h = d.getHours();
        const watch = h < 3 ? "the dead of night" : h < 6 ? "the small hours" : h < 9 ? "dawn" : h < 12 ? "morning"
            : h < 14 ? "high noon" : h < 17 ? "afternoon" : h < 20 ? "dusk" : "nightfall";
        hud.innerHTML = "<b>" + pad(h) + ":" + pad(d.getMinutes()) + "</b> <i>" + watch + "</i>";
    }

    /* ---- 5. Boot sequence, once per Steam start ------------------------ */
    function boot_sequence() {
        if (flag("--od-boot") === "off" || motion() === 0) return;
        if (sessionStorage && sessionStorage.getItem("od-booted")) return;
        try { sessionStorage.setItem("od-booted", "1"); } catch (e) {}
        const epigraphs = [
            "Every road out of the dark begins with a single lantern.",
            "The lanterns are lit. The road waits.",
            "The candle is lit. The tale may begin.",
            "Old roads, new monsters, and a long night ahead."
        ];
        const el = document.createElement("div");
        el.className = "od-boot";
        el.innerHTML = "<div class='sb-sigil'></div><div class='od-boot-title'>Silverbane</div><div class='sb-rule'></div>" +
            "<div class='sb-epigraph'>" + epigraphs[Math.floor(Math.random() * epigraphs.length)] + "</div>";
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3300);
    }

    /* ---- Wiring ------------------------------------------------------- */
    function boot() {
        document.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("pointerleave", () => { if (tilted) resetTilt(tilted); }, { passive: true });
        window.addEventListener("resize", () => placeIndicator(true), { passive: true });

        let queued = false;
        const mo = new MutationObserver(() => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => { queued = false; placeIndicator(false); });
        });
        mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => placeIndicator(true));
            const watch = () => { const nav = document.querySelector(".SuperNav"); if (nav && !nav.__mrRO) { nav.__mrRO = true; ro.observe(nav); } };
            watch();
            setInterval(watch, 2000);
        }
        placeHud();
        setInterval(placeHud, 1000);
        boot_sequence();
        window.__silverbaneReplayBoot = () => { try { sessionStorage.removeItem("od-booted"); } catch (e) {} boot_sequence(); };
        placeIndicator(true);
        // Fonts settle a little after first paint: re-measure once more.
        setTimeout(() => placeIndicator(true), 600);
    }

    if (document.body) boot();
    else document.addEventListener("DOMContentLoaded", boot, { once: true });
})();
