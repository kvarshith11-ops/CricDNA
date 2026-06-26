interface StatusMessageProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export const StatusMessage = ({
  title,
  message,
  actionLabel,
  onAction,
}: StatusMessageProps) => {
  return (
    <div className="status-card" role="status">
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <button type="button" className="primary-button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
