export default function About({ about, profilePhoto }) {
  return (
    <section className="section-wrap bg-gray" id="about">
      <div className="section-inner">
        <div className="about-grid">
          <div className="reveal">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="about-photo" />
            ) : (
              <div className="about-photo-placeholder">
                <span style={{ fontSize: 28, opacity: 0.3 }}>👤</span>
              </div>
            )}
          </div>

          <div className="about-text">
            <div className="reveal reveal-d1">
              <p className="section-label">About</p>
              <h2 className="section-title">{about.heading || 'Who I am'}</h2>
            </div>
            <p className="about-bio reveal reveal-d2">{about.bio}</p>
            <p className="about-journey reveal reveal-d3">{about.journey}</p>
            <p className="about-footer reveal reveal-d4">
              Philadelphia, PA &nbsp;·&nbsp; Posse Scholar &nbsp;·&nbsp; Information Science
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
