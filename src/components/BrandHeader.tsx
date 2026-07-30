type BrandHeaderProps = {
  compact?: boolean;
  showBanner?: boolean;
};

export function BrandHeader({ compact = false, showBanner = true }: BrandHeaderProps) {
  return (
    <header className={`brand-header ${compact ? "compact" : ""}`}>
      <div className="brand-wordmark" aria-label="Dom the Don">
        <span className="brand-dom">
          D<span className="hat-letter">O</span>M
        </span>
        <span className="brand-don">THE DON</span>
      </div>
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
