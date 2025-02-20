import NumberFlow from "@number-flow/react";

type HumanFileSizeMotionProps = {
  size: number;
};

export function HumanFileSizeMotion({ size }: HumanFileSizeMotionProps) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));

  return (
    <span className="inline-flex items-center">
      <NumberFlow value={+(size / 1024 ** i).toFixed(2) * 1} />
      {["B", "kB", "MB", "GB", "TB"][i]}
    </span>
  );
}
