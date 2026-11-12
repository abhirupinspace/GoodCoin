import Link from "next/link";

export default function NotFound() {
  return (
    <main className="outline">
      <h1>This fire went out.</h1>
      <p>Nothing lives at this address. <Link href="/">Back home</Link> or <Link href="/app">see this week's fire</Link>.</p>
    </main>
  );
}
