import { VerifyView } from "@/components/LoginView";

export const instant = false;

export default async function VerifyPageEn({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyView locale="en" token={token} />;
}
