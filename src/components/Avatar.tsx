const COLOURS = ["#92400e", "#9a3412", "#065f46", "#1e3a8a", "#6b21a8", "#9d174d", "#334155", "#854d0e"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Initials in a coloured circle. No uploaded profile photos: nothing to moderate, nothing to leak. */
export default function Avatar({ name, id, size = 32 }: { name: string; id: string; size?: number }) {
  const initials =
    name
      .replace(/[^\p{L}\p{N} _-]/gu, "")
      .split(/[\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, background: COLOURS[hash(id) % COLOURS.length] }}
    >
      {initials}
    </span>
  );
}

export function profileHref(userId: string) {
  return `/profile?id=${userId}`;
}
