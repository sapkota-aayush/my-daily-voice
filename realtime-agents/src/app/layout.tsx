import type { Metadata } from "next";
import "./globals.css";
import { NotificationContainer } from "@/app/components/Notification";

export const metadata: Metadata = {
  title: "Yours",
  description: "A voice-first journaling platform revolutionizing self-reflection and personal growth",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <NotificationContainer />
      </body>
    </html>
  );
}
