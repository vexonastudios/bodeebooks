type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: {
    href: string;
    label: string;
  };
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  action
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <p className="section-heading__eyebrow">{eyebrow}</p>
        <h2 className="section-heading__title">{title}</h2>
        <p className="section-heading__description">{description}</p>
      </div>

      {action ? (
        <a className="button button--ghost" href={action.href}>
          {action.label}
        </a>
      ) : null}
    </div>
  );
}
