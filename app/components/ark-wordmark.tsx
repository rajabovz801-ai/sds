export default function ArkWordmark({subtitle="60-DAY CHALLENGE"}:{subtitle?:string}) {
  return <span className="ark-wordmark" aria-label={"ARK IELTS · "+subtitle}>
    <span className="ark-wordmark-title"><strong>ARK</strong><span>IELTS</span></span>
    <span className="ark-wordmark-subtitle">{subtitle}<i aria-hidden="true"/></span>
  </span>;
}
