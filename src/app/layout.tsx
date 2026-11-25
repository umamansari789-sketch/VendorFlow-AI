import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VendorFlow AI — Close every vendor compliance gap",
  description:
    "Vendor compliance resolution platform for property, facility and construction teams. Detect gaps, chase vendors and close issues with a full audit trail.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
