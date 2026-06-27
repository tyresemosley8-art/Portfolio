const DEFAULT_EXPERIENCE = [
  { id: '1', company: 'We Love Philly', role: 'Technology Project Lead', initials: 'WP' },
  { id: '2', company: 'University of Pittsburgh', role: 'Information Science Student', initials: 'UP' },
  { id: '3', company: 'AWS', role: 'Cloud Practitioner Certified', initials: 'AWS' },
  { id: '4', company: 'Google', role: 'Cybersecurity Certificate', initials: 'G' },
  { id: '5', company: 'NICE Conference', role: 'Cybersecurity Attendee', initials: 'NC' },
  { id: '6', company: '1PHL Tech', role: 'Conference Attendee', initials: '1P' },
]

export default function Experience({ experience }) {
  const items = experience?.length ? experience : DEFAULT_EXPERIENCE
  const doubled = [...items, ...items]

  return (
    <section className="section-wrap" id="experience">
      <div className="reveal">
        <p className="section-label">Experience</p>
        <h2 className="section-title">Where I've been</h2>
      </div>

      <div className="marquee-wrap reveal reveal-d1">
        <div className="marquee-track">
          {doubled.map((item, i) => (
            <div key={i} className="marquee-item">
              <div className={`marquee-logo${item.logo ? ' has-img' : ''}`}>
                {item.logo
                  ? <img src={item.logo} alt={item.company} className="marquee-logo-img" />
                  : <span className="marquee-initials">{item.initials}</span>
                }
              </div>
              <div className="marquee-info">
                <p className="marquee-company">{item.company}</p>
                <p className="marquee-role">{item.role}</p>
              </div>
              <span className="marquee-sep" aria-hidden="true">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
