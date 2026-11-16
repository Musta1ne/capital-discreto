type IconName =
  | "arrow-right"
  | "arrow-left"
  | "trend"
  | "expand"
  | "close"
  | "check"
  | "reset"
  | "book"
  | "chevron";

const paths: Record<IconName, string> = {
  "arrow-right": "M4 12h16m-6-6 6 6-6 6",
  "arrow-left": "M20 12H4m6-6-6 6 6 6",
  trend: "M4 19h5v-6h6V6h5M15 6h5v5",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  reset: "M4 10a8 8 0 1 1 1 8M4 4v6h6",
  book: "M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v14h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z",
  chevron: "m9 5 7 7-7 7",
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
