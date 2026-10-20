import { VerifyView } from "@/components/LoginView";

export const instant = false;

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyView locale="ja" token={token} />;
}
