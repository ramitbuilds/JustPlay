export default function LoadingSkeleton({
  cards = false,
}: {
  cards?: boolean;
}) {
  return (
    <div
      className={cards ? "library-skeletons" : "game-skeleton"}
      aria-hidden="true"
    >
      {cards ? (
        [0, 1, 2].map((i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton skeleton-cover" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        ))
      ) : (
        <>
          <div className="skeleton-score">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
          <div className="skeleton skeleton-canvas" />
          <div className="skeleton-controls">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        </>
      )}
    </div>
  );
}
