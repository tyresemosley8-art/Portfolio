const DEFAULT_VERSE = 'Yet what we suffer now is nothing compared to the glory he will reveal to us later.'
const DEFAULT_CITATION = 'Romans 8:18 — NLT'

export default function Quote({ quote }) {
  const verse = quote?.verse || DEFAULT_VERSE
  const citation = quote?.citation || DEFAULT_CITATION

  return (
    <section className="quote-section">
      <p className="quote-main reveal">{verse}</p>
      <p className="quote-verse reveal reveal-d1">{citation}</p>
    </section>
  )
}
