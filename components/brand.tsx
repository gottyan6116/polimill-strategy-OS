export default function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={`brand ${large ? "brand-large" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      <span>
        <strong>Polimill</strong>
        <span>Strategy OS</span>
      </span>
    </div>
  );
}
