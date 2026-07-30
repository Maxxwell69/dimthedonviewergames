import Image from "next/image";

type BrandHeaderProps = {
  compact?: boolean;
  showBanner?: boolean;
};

export function BrandHeader({ compact = false, showBanner = true }: BrandHeaderProps) {
  return (
    <header className={`brand-header ${compact ? "compact" : ""}`}>
      <Image
        src="/dom-the-don-logo.png"
        alt="Dom the Don"
        width={720}
        height={320}
        priority
        className="brand-logo"
      />
      {showBanner ? (
        <div className="viewer-banner brand-banner">
          <span>★</span>
          <strong>VIEWER GAMES</strong>
          <span>★</span>
        </div>
      ) : null}
    </header>
  );
}
