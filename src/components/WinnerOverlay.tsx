"use client";

type WinnerOverlayProps = {
  winner: string | null;
  visible: boolean;
  onDismiss?: () => void;
  showControls?: boolean;
};

export function WinnerOverlay({
  winner,
  visible,
  onDismiss,
  showControls = false,
}: WinnerOverlayProps) {
  if (!visible || !winner) return null;

  return (
    <div className="winner-overlay">
      <div className="winner-card">
        <p className="winner-kicker">Selected</p>
        <h2 className="winner-name">{winner}</h2>
        {showControls ? (
          <button type="button" className="btn gold" onClick={onDismiss}>
            Continue
          </button>
        ) : null}
      </div>
    </div>
  );
}
