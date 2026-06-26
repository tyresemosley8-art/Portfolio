export default function Toast({ message, type = 'success' }) {
  const icon = type === 'success' ? '✓' : type === 'warn' ? '⚠' : '✕'
  return (
    <div className={`toast${type !== 'success' ? ` ${type}` : ''}`}>
      <span>{icon}</span>
      {message}
    </div>
  )
}
