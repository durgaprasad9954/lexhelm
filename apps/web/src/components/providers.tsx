"use client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const content = (
    <AuthProvider>
      {children}
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  );

  return (
    googleClientId
      ? <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>
      : content
  );
}
