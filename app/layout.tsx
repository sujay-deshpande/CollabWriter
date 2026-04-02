import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import 'devicon/devicon.min.css'; 
import { ClerkProvider } from "@clerk/nextjs";
import { dark, neobrutalism } from '@clerk/themes';


const manrope = Manrope({ subsets: ["latin"] });
export const metadata: Metadata = {
  title: "CollabWriter",
  description: "Collaborate efficiently with friends, colleagues, and mentors by using built-in video and voice chat to enhance your teamwork. Leverage the power of AI with Vertex AI on Google Cloud Platform to get top-notch suggestions and boilerplate code. Experience the seamless integration of collaboration and AI.",
  icons:"/icons/logo.png"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{baseTheme: [dark, neobrutalism]}}>
      <html lang="en">
        <body className={`${manrope.className}`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}