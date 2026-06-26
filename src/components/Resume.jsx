export default function Resume({ resume, heading }) {
  return (
    <section className="section-wrap bg-gray" id="resume">
      <div className="section-inner">
        <div className="resume-head reveal">
          <div>
            <p className="section-label">Resume</p>
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              {heading || 'Download my resume'}
            </h2>
          </div>
          {resume && (
            <a
              href={resume}
              download="Tyrese_Mosley_Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="resume-dl-btn"
            >
              ↓ Download PDF
            </a>
          )}
        </div>

        <div className="reveal reveal-d1">
          {resume ? (
            <iframe
              src={resume}
              className="resume-frame"
              title="Resume"
            />
          ) : (
            <div className="resume-empty">
              <span className="resume-empty-icon">📄</span>
              <span>Upload your resume in the admin panel</span>
              <span style={{ fontSize: 12, opacity: 0.6 }}>Press Shift + T + M to open admin</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
