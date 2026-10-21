import type { Metadata } from "next";
import { LoginView } from "@/components/LoginView";

export const instant = false;

export const metadata: Metadata = { title: "Log in | Consilegy Partner Program" };

export default async function LoginPageEn({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; expired?: string }>;
}) {
  const { sent, expired } = await searchParams;
  return <LoginView locale="en" sent={sent} expired={expired} />;
}
