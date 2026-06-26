export default function Hero({ hero, profilePhoto }) {
  return (
    <section className="hero" id="hero">
      <div className="hero-content">
        <div className="hero-eyebrow">
          <span className="eyebrow-dot" />
          Philadelphia, PA
        </div>
        <h1 className="hero-name">{hero.name}</h1>
        <p className="hero-subtitle">{hero.subtitle}</p>
      </div>

      <div className="hero-photo-wrap">
        {profilePhoto ? (
          <img src={profilePhoto} alt={hero.name} className="hero-photo" />
        ) : (
          <div className="hero-photo-placeholder">
            <span style={{ fontSize: 32, opacity: 0.3 }}>👤</span>
            <span>Add photo in admin</span>
          </div>
        )}
      </div>
    </section>
  )
}
