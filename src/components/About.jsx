const SEP = String.fromCharCode(183)

export default function About({ about, profilePhoto }) {
  const photo = about.photo || profilePhoto
  const footer = about.footer || ('Philadelphia, PA ' + SEP + ' Posse Scholar ' + SEP + ' Information Science')

  return (
    <section className="section-wrap bg-gray" id="about">
      <div className="section-inner">
        <div className="about-grid">
          <div className="reveal">
            {photo ? (
              <img src={photo} alt="Profile" className="about-photo" />
            ) : (
              <div className="about-photo-placeholder">
                <span style={{ fontSize: 28, opacity: 0.3 }}>&#128100;</span>
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
            <p className="about-footer reveal reveal-d4">{footer}</p>
          </div>
        </div>
      </div>
    </section>
  )
}