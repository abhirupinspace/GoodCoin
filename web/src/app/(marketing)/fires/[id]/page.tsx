import { OpenFire } from "@/components/fires/OpenFire";

export default async function FireRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpenFire id={decodeURIComponent(id)} />;
}
