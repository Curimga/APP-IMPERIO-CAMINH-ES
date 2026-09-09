import logo from "@/assets/logo.png";

/** Square mark — uses the full logo cropped via object-contain. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <img
      src={logo}
      alt="Império Caminhões"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="object-contain"
    />
  );
}

/** Full wordmark — the uploaded logo already includes "IMPÉRIO CAMINHÕES". */
export function BrandWordmark({
  className = "",
  height = 44,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={logo}
        alt="Império Caminhões"
        style={{ height, width: "auto" }}
        className="object-contain select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
        draggable={false}
      />
    </div>
  );
}
