/**
 * Badge — pastel pill. `tone`: neutral | primary | success | warning | danger | info.
 * The dot is decorative; the text always carries the meaning.
 */
export default function Badge({ tone = 'neutral', dot = true, children, title }) {
  return (
    <span className={`adm-badge tone-${tone}`} title={title}>
      {dot && <span className="adm-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
