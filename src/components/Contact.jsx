function EmailIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m2 4 10 9 10-9"/>
    </svg>
  )
}
function LinkedInIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )
}
function GitHubIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  )
}

export default function Contact({ contact }) {
  const email = contact?.email || ''
  const linkedin = contact?.linkedin || ''
  const github = contact?.github || ''
  const subtext = contact?.subtext || 'Open to internships, opportunities, and conversations.'
  const hasLinks = email || linkedin || github

  return (
    <section className="contact-section" id="contact">
      <p className="contact-label">Contact</p>
      <h2 className="contact-heading reveal">Let's connect.</h2>
      <p className="contact-sub reveal reveal-d1">{subtext}</p>
      <div className="contact-links reveal reveal-d2">
        {hasLinks ? (
          <>
            {email && (
              <a href={`mailto:${email}`} className="contact-link">
                <EmailIcon />
                <span className="contact-link-label">Email</span>
              </a>
            )}
            {linkedin && (
              <a href={linkedin} target="_blank" rel="noopener noreferrer" className="contact-link">
                <LinkedInIcon />
                <span className="contact-link-label">LinkedIn</span>
              </a>
            )}
            {github && (
              <a href={github} target="_blank" rel="noopener noreferrer" className="contact-link">
                <GitHubIcon />
                <span className="contact-link-label">GitHub</span>
              </a>
            )}
          </>
        ) : (
          <>
            <span className="contact-link contact-link-placeholder"><EmailIcon /><span className="contact-link-label">Email</span></span>
            <span className="contact-link contact-link-placeholder"><LinkedInIcon /><span className="contact-link-label">LinkedIn</span></span>
            <span className="contact-link contact-link-placeholder"><GitHubIcon /><span className="contact-link-label">GitHub</span></span>
          </>
        )}
      </div>
      <p className="contact-copy">© 2026 Tyrese Mosley. Built from scratch.</p>
    </section>
  )
}
