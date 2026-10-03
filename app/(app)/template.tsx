/**
 * Wraps every page and is made fresh on each navigation, so each page arrives
 * with a short fade instead of popping in. The bands inside then rise in turn.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>
}
