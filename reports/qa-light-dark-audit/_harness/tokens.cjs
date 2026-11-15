/* WCAG contrast for the declared design tokens (values read from src/index.css). */
const hex = (h) => {
  const v = h.replace("#", "");
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16), a: 1 };
};
const rgba = (r, g, b, a) => ({ r, g, b, a });
const lum = ({ r, g, b }) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
};
const blend = (fg, bg) => rgba(fg.r * fg.a + bg.r * (1 - fg.a), fg.g * fg.a + bg.g * (1 - fg.a), fg.b * fg.a + bg.b * (1 - fg.a), 1);

const light = {
  canvas: hex("#f4f1ea"), surface: rgba(255, 253, 249, 0.74), surface2: hex("#efeae1"), elevated: hex("#fffdfa"),
  ink: hex("#0d1117"), text: hex("#26303f"), muted: hex("#5d6674"), mutedStrong: hex("#424b58"), faint: hex("#78818d"),
  primary: hex("#16243b"), onPrimary: hex("#fbf8f2"), sage: hex("#3f6b5b"), accent: hex("#c2a36b"), accentStrong: hex("#8f6c34"),
  success: hex("#2f7d5b"), successSoft: hex("#e8f3ec"), danger: hex("#b4475c"), dangerSoft: hex("#fbeaee"),
  warning: hex("#8f6516"), warningSoft: hex("#fbf1dd"), info: hex("#2f5f8f"), infoSoft: hex("#e9f0f7"),
  neutral: hex("#5f6a78"), neutralSoft: hex("#edf0f3"), violet: hex("#4f6d74"), violetSoft: hex("#e7eef0"),
};
const dark = {
  canvas: hex("#070b12"), surface: rgba(16, 24, 36, 0.74), surface2: hex("#0f1825"), elevated: hex("#101a28"),
  ink: hex("#f4efe5"), text: hex("#e3ded3"), muted: hex("#9ba4b1"), mutedStrong: hex("#c4cbd5"), faint: hex("#7f8896"),
  primary: hex("#2c4768"), onPrimary: hex("#ffffff"), sage: hex("#7fbfa8"), accent: hex("#d6b77d"), accentStrong: hex("#e7cf9f"),
  success: hex("#74d3a8"), successSoft: hex("#122e25"), danger: hex("#f898ab"), dangerSoft: hex("#341823"),
  warning: hex("#e8c079"), warningSoft: hex("#302715"), info: hex("#94b8e6"), infoSoft: hex("#142438"),
  neutral: hex("#adb8c6"), neutralSoft: hex("#192432"), violet: hex("#9fc3c9"), violetSoft: hex("#14272b"),
};
const admin = {
  canvas: hex("#070b12"), ink: hex("#f3efe6"), text: hex("#d9dee7"), muted: hex("#a5b0c0"), mutedStrong: hex("#c9d2df"),
  faint: hex("#8492a6"), primary: hex("#27405f"), onPrimary: hex("#f8f5ee"), accent: hex("#d8bb82"),
  accentStrong: hex("#e7cf9f"), danger: hex("#f898ab"), dangerSoft: rgba(180, 71, 92, 0.2),
  warning: hex("#e8c079"), warningSoft: rgba(143, 101, 22, 0.22), success: hex("#74d3a8"),
  successSoft: rgba(47, 125, 91, 0.2), info: hex("#94b8e6"), infoSoft: rgba(47, 95, 143, 0.22),
  sidebarBg: hex("#0a1320"),
};
dark.surfaceOverCanvas = blend({ ...dark.surface, a: 1 }, dark.canvas);
light.surfaceOverCanvas = blend(light.surface, light.canvas);
admin.dangerSoftOverCanvas = blend(admin.dangerSoft, admin.canvas);
admin.warningSoftOverCanvas = blend(admin.warningSoft, admin.canvas);
admin.successSoftOverCanvas = blend(admin.successSoft, admin.canvas);
admin.infoSoftOverCanvas = blend(admin.infoSoft, admin.canvas);

const pairs = [
  ["light", "text on canvas", light.text, light.canvas],
  ["light", "muted on canvas", light.muted, light.canvas],
  ["light", "muted-strong on canvas", light.mutedStrong, light.canvas],
  ["light", "faint on canvas", light.faint, light.canvas],
  ["light", "ink on canvas", light.ink, light.canvas],
  ["light", "muted on elevated surface", light.muted, light.elevated],
  ["light", "faint on elevated surface", light.faint, light.elevated],
  ["light", "on-primary on primary", light.onPrimary, light.primary],
  ["light", "accent-strong on canvas", light.accentStrong, light.canvas],
  ["light", "accent on primary", light.accent, light.primary],
  ["light", "success on success-soft", light.success, light.successSoft],
  ["light", "danger on danger-soft", light.danger, light.dangerSoft],
  ["light", "warning on warning-soft", light.warning, light.warningSoft],
  ["light", "info on info-soft", light.info, light.infoSoft],
  ["light", "neutral on neutral-soft", light.neutral, light.neutralSoft],
  ["light", "violet on violet-soft", light.violet, light.violetSoft],
  ["dark", "text on canvas", dark.text, dark.canvas],
  ["dark", "muted on canvas", dark.muted, dark.canvas],
  ["dark", "muted-strong on canvas", dark.mutedStrong, dark.canvas],
  ["dark", "faint on canvas", dark.faint, dark.canvas],
  ["dark", "ink on canvas", dark.ink, dark.canvas],
  ["dark", "muted on elevated surface", dark.muted, dark.elevated],
  ["dark", "faint on elevated surface", dark.faint, dark.elevated],
  ["dark", "on-primary on primary", dark.onPrimary, dark.primary],
  ["dark", "accent-strong on canvas", dark.accentStrong, dark.canvas],
  ["dark", "success on success-soft", dark.success, dark.successSoft],
  ["dark", "danger on danger-soft", dark.danger, dark.dangerSoft],
  ["dark", "warning on warning-soft", dark.warning, dark.warningSoft],
  ["dark", "info on info-soft", dark.info, dark.infoSoft],
  ["dark", "neutral on neutral-soft", dark.neutral, dark.neutralSoft],
  ["dark", "violet on violet-soft", dark.violet, dark.violetSoft],
  ["admin", "text on canvas", admin.text, admin.canvas],
  ["admin", "muted on canvas", admin.muted, admin.canvas],
  ["admin", "faint on canvas", admin.faint, admin.canvas],
  ["admin", "on-primary on primary", admin.onPrimary, admin.primary],
  ["admin", "accent-strong on canvas", admin.accentStrong, admin.canvas],
  ["admin", "danger on danger-soft", admin.danger, admin.dangerSoftOverCanvas],
  ["admin", "warning on warning-soft", admin.warning, admin.warningSoftOverCanvas],
  ["admin", "success on success-soft", admin.success, admin.successSoftOverCanvas],
  ["admin", "info on info-soft", admin.info, admin.infoSoftOverCanvas],
  ["admin", "sidebar white/58 on sidebar", rgba(255, 255, 255, 0.58), admin.sidebarBg],
  ["admin", "sidebar white/35 label on sidebar", rgba(255, 255, 255, 0.35), admin.sidebarBg],
  ["admin", "sidebar white/50 on sidebar", rgba(255, 255, 255, 0.5), admin.sidebarBg],
];

const out = pairs.map(([theme, name, fg, bg]) => ({
  theme, name, ratio: ratio(fg, bg), aaNormal: ratio(fg, bg) >= 4.5, aaLarge: ratio(fg, bg) >= 3, ui: ratio(fg, bg) >= 3,
}));
require("fs").writeFileSync(require("path").join(__dirname, "../data/tokens.json"), JSON.stringify(out, null, 2));
console.log(out.map((r) => `${r.ratio >= 4.5 ? "PASS" : r.ratio >= 3 ? "LARGE-ONLY" : "FAIL"} ${String(r.ratio).padEnd(6)} ${r.theme.padEnd(6)} ${r.name}`).join("\n"));
