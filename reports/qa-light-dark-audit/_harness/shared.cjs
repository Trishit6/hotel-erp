/* Shared, read-only collection helpers for the QA audit. */
const path = require("path");

const BASE = "http://localhost:5173";
const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "reports/qa-light-dark-audit");
const SHOT = path.join(OUT, "screens");
const DATA = path.join(OUT, "data");

const collect = () => {
  const vw = window.innerWidth;
  const de = document.documentElement;
  const parse = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratioOf = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const blend = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const canvas = parse(getComputedStyle(de).getPropertyValue("--canvas")) || { r: 244, g: 241, b: 234, a: 1 };
  const effBg = (el) => {
    const chain = [];
    let node = el;
    while (node && node.nodeType === 1) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) chain.push(c);
      node = node.parentElement;
    }
    let bg = canvas;
    for (let i = chain.length - 1; i >= 0; i--) bg = blend(chain[i], bg);
    return bg;
  };
  const overMedia = (el) => {
    let node = el;
    while (node && node.nodeType === 1) {
      if (["BODY", "HTML"].includes(node.tagName)) { node = node.parentElement; continue; }
      const s = getComputedStyle(node);
      if (s.backgroundImage && s.backgroundImage !== "none") return true;
      if (["IMG", "VIDEO", "PICTURE"].includes(node.tagName)) return true;
      node = node.parentElement;
    }
    return false;
  };

  const fails = [];
  const families = {};
  const sizes = {};
  let checked = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    const text = (n.nodeValue || "").trim();
    if (!text) continue;
    seen.add(el);
    const st = getComputedStyle(el);
    if (st.visibility === "hidden" || st.display === "none") continue;
    if (parseFloat(st.opacity) < 0.15) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < 0 || r.top > window.innerHeight * 12) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const fg = parse(st.color);
    if (!fg || fg.a < 0.05) continue;
    const bg = effBg(el);
    const fgC = fg.a < 1 ? blend(fg, bg) : fg;
    const size = parseFloat(st.fontSize);
    const weight = parseInt(st.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const ratio = ratioOf(fgC, bg);
    checked++;
    const fam = st.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    families[fam] = (families[fam] || 0) + 1;
    sizes[Math.round(size)] = (sizes[Math.round(size)] || 0) + 1;
    const media = overMedia(el);
    if (ratio + 0.005 < need) {
      fails.push({
        text: text.slice(0, 70), tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 110),
        fg: st.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
        ratio: Math.round(ratio * 100) / 100, need,
        size: Math.round(size * 10) / 10, weight, overMedia: media,
      });
    }
  }
  const solid = fails.filter((f) => !f.overMedia).sort((a, b) => a.ratio - b.ratio);
  const media = fails.filter((f) => f.overMedia);

  const offenders = [];
  document.querySelectorAll("body *").forEach((el) => {
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return;
    const r = el.getBoundingClientRect();
    if (r.width < 1) return;
    if (r.right > vw + 1 || r.left < -1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 100),
        left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
      });
    }
  });
  offenders.sort((a, b) => b.right - a.right);

  const pressables = [...document.querySelectorAll("button, a, [role=button]")].filter((el) => {
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  const smallTargets = pressables.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
      tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height),
    };
  }).filter((t) => t.w < 24 || t.h < 24);

  const iconButtons = [...document.querySelectorAll("button")].map((b) => {
    const name = (b.getAttribute("aria-label") || b.getAttribute("title") || b.textContent || "").trim();
    return { name, html: b.outerHTML.slice(0, 120) };
  }).filter((b) => !b.name);

  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
    level: Number(h.tagName[1]), text: (h.textContent || "").trim().slice(0, 60),
  }));
  let skips = 0;
  for (let i = 1; i < headings.length; i++) if (headings[i].level - headings[i - 1].level > 1) skips++;

  return {
    url: location.pathname + location.search,
    title: document.title,
    themeAttr: de.dataset.theme,
    metaThemeColor: document.querySelector('meta[name="theme-color"]')?.content,
    storedTheme: (() => { try { return localStorage.getItem("rivr-theme"); } catch { return "ERR"; } })(),
    canvasVar: getComputedStyle(de).getPropertyValue("--canvas").trim(),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    hScroll: de.scrollWidth - de.clientWidth,
    clientW: de.clientWidth,
    overflowOffenders: offenders.slice(0, 12),
    overflowCount: offenders.length,
    contrast: { checked, failCount: fails.length, solidFailCount: solid.length, mediaFailCount: media.length, solid: solid.slice(0, 10), media: media.slice(0, 5) },
    fonts: {
      families, sizes,
      manrope: document.fonts.check('16px "Manrope"'),
      cormorant: document.fonts.check('16px "Cormorant Garamond"'),
      status: document.fonts.status,
      jsLoaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`).slice(0, 10),
    },
    imgs: {
      total: document.images.length,
      missingAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
      broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
    },
    headings, headingSkips: skips,
    h1Count: document.querySelectorAll("h1").length,
    landmarks: {
      header: document.querySelectorAll("header").length, main: document.querySelectorAll("main").length,
      footer: document.querySelectorAll("footer").length, nav: document.querySelectorAll("nav").length,
    },
    toggle: (() => {
      const b = [...document.querySelectorAll("button")].find((x) => /switch to (light|dark) mode/i.test(x.getAttribute("aria-label") || ""));
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { label: b.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height) };
    })(),
    smallTargets: smallTargets.slice(0, 12),
    smallTargetCount: smallTargets.length,
    iconButtonsMissingName: iconButtons.slice(0, 8),
    iconButtonMissingNameCount: iconButtons.length,
  };
};

async function visit(page, route, theme, shotName, fullPage) {
  const res = { route, theme, console: [], pageErrors: [], failedRequests: [] };
  const onConsole = (m) => { if (m.type() === "error") res.console.push(m.text().slice(0, 300)); };
  const onError = (e) => res.pageErrors.push(String(e).slice(0, 300));
  const onFail = (r) => { if (!r.url().includes("favicon")) res.failedRequests.push(`${r.url().slice(0, 180)} :: ${r.failure()?.errorText}`); };
  page.on("console", onConsole);
  page.on("pageerror", onError);
  page.on("requestfailed", onFail);
  try {
    const resp = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
    res.status = resp ? resp.status() : null;
    await page.waitForTimeout(500);
    res.metrics = await page.evaluate(collect);
    if (shotName) {
      await page.screenshot({ path: require("path").join(SHOT, `${shotName}.png`), fullPage: !!fullPage });
      res.screenshot = shotName;
    }
  } catch (e) {
    res.navError = String(e).slice(0, 300);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onError);
    page.off("requestfailed", onFail);
  }
  return res;
}

module.exports = { BASE, ROOT, OUT, SHOT, DATA, collect, visit };
