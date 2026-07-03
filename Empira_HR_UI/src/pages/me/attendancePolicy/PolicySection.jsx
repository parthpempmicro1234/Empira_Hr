export default function PolicySection({ title, children, className = '' }) {
  return (
    <section className={`mb-7 last:mb-0 ${className}`.trim()}>
      {title ? <h3 className="mb-2.5 text-[15px] font-semibold text-white">{title}</h3> : null}
      <div className="space-y-3 text-sm leading-relaxed text-gray-300">{children}</div>
    </section>
  );
}
