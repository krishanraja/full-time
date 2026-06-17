import wordmark from "@/assets/full-time-wordmark.png.asset.json";
import mark from "@/assets/full-time-mark.png.asset.json";

export function LogoMark({ className = "" }: { className?: string }) {
  return <img src={mark.url} alt="" aria-hidden className={className} />;
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <img
      src={wordmark.url}
      alt="Full Time"
      className={className}
      draggable={false}
    />
  );
}
