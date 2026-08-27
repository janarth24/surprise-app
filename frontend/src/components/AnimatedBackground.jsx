export default function AnimatedBackground({ children }) {
  return (
    <div className="main-background-wrapper">
      {/* Dynamic Floating Emojis Layer */}
      <div className="floating-container">
        <span className="float-item item-1">🎈</span>
        <span className="float-item item-2">🎁</span>
        <span className="float-item item-3">✨</span>
        <span className="float-item item-4">🎈</span>
        <span className="float-item item-5">🎁</span>
        <span className="float-item item-6">🎉</span>
      </div>

      {/* Main Page Dynamic Children */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}