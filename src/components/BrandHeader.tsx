type BrandHeaderProps = {
  compact?: boolean;
  showBanner?: boolean;
};

export function BrandHeader({ compact = false, showBanner = true }: BrandHeaderProps) {
  return (
    <header className={`brand-header ${compact ? "compact" : ""}`}>
      {/* Native img keeps PNG alpha clean (Next/Image can paint a dark plate). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dom-the-don-logo.png"
        alt="Dom the Don"
        className="brand-logo"
        width={720}
        height={320}
        decoding="async"
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
