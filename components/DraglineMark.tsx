export function DraglineMark({
  size = 40,
  fill = "#e8e6e1",
  cable = "#ffb547",
}: {
  size?: number;
  fill?: string;
  cable?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" aria-label="Dragline 3D">
      <g fill={fill}>
        <rect x="28" y="26" width="58" height="6" rx="1" />
        <rect x="28" y="38" width="74" height="6" rx="1" />
        <rect x="28" y="50" width="82" height="6" rx="1" />
        <rect x="28" y="62" width="84" height="6" rx="1" />
        <rect x="28" y="74" width="84" height="6" rx="1" />
        <rect x="28" y="86" width="82" height="6" rx="1" />
        <rect x="28" y="98" width="74" height="6" rx="1" />
        <rect x="28" y="110" width="58" height="6" rx="1" />
      </g>
      <line
        x1="36"
        y1="116"
        x2="108"
        y2="32"
        stroke={cable}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
