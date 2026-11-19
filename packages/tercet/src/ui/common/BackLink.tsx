import Link from "next/link";

export default function BackLink({ text, label }: { text: string; label: string }) {
  return (
    <Link href="/" className="label" aria-label={label}>
      {text}
    </Link>
  );
}
