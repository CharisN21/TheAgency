/**
 * The screen you see for a moment when the app is opened from the Home Screen
 * or the installed app: the workspace's own mark, its name, and "by The Agency"
 * in small capitals at the bottom, then it fades into the app. Pure CSS (see
 * `.launch-splash` in globals.css), so it needs no script, and it is shown only
 * when the app runs installed, never in an ordinary browser tab.
 */
export function LaunchSplash({ name, title, color }: { name: string; title?: string; color: string }) {
  return (
    <div className="launch-splash" aria-hidden="true">
      <div className="launch-splash-mark flex flex-col items-center gap-4">
        <span
          className="flex size-24 items-center justify-center rounded-[22%] text-5xl font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {Array.from(name.trim())[0]?.toUpperCase()}
        </span>
        <span className="flex flex-col items-center">
          <span className="text-lg font-semibold tracking-tight">{name}</span>
          {title && title.trim().toLowerCase() !== name.trim().toLowerCase() && (
            <span className="text-muted-foreground text-sm">{title}</span>
          )}
        </span>
      </div>
      <span className="launch-splash-by text-muted-foreground">by The Agency</span>
    </div>
  )
}
