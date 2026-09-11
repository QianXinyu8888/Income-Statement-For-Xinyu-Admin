export function LoadingSpinner() {
  return (
    <svg
      className="loading-spinner"
      viewBox="0 0 40 40"
      fill="none"
      role="presentation"
      focusable="false"
    >
      <circle cx="20" cy="20" r="4" fill="currentColor" />
      <ellipse cx="20" cy="20" rx="14" ry="6" stroke="currentColor" strokeWidth="2.5" opacity="0.75">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 20 20"
          to="360 20 20"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse
        cx="20"
        cy="20"
        rx="14"
        ry="6"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.35"
        transform="rotate(60 20 20)"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="60 20 20"
          to="420 20 20"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </ellipse>
    </svg>
  );
}
