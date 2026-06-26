export default function Projects({ projects, heading }) {
  return (
    <section className="section-wrap" id="projects">
      <div className="reveal">
        <p className="section-label">Work</p>
        <h2 className="section-title">{heading || "Things I've built"}</h2>
      </div>

      <div className="projects-grid">
        {projects.map((p, i) => (
          <div key={p.id} className={`proj-card reveal reveal-d${Math.min(i + 1, 4)}`}>
            {p.image ? (
              <img src={p.image} alt={p.title} className="proj-img" />
            ) : (
              <div className="proj-img-placeholder">
                <span style={{ fontSize: 28, opacity: 0.2 }}>🖥</span>
              </div>
            )}
            <div className="proj-body">
              <h3 className="proj-title">{p.title}</h3>
              <p className="proj-desc">{p.description}</p>
              {p.stack?.length > 0 && (
                <div className="proj-stack">
                  {p.stack.map(t => <span key={t} className="stack-tag">{t}</span>)}
                </div>
              )}
              {p.link && (
                <a href={p.link} target="_blank" rel="noopener noreferrer" className="proj-link">
                  View project ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
