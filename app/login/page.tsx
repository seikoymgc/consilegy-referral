import { LoginView } from "@/components/LoginView";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; expired?: string }>;
}) {
  const { sent, expired } = await searchParams;
  return <LoginView locale="ja" sent={sent} expired={expired} />;
}
