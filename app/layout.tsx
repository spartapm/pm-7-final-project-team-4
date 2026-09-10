import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppFrame } from "@/components/ui";
import { CloudBanner } from "@/components/CloudBanner";
import { ActionErrorBar } from "@/components/system";

export const metadata: Metadata = {
  title: "Pet Memory",
  description: "반려동물과 함께한 시간과 추억을 기록해요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jua&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <Providers>
          <AppFrame>
            <CloudBanner />
            <ActionErrorBar />
            {children}
          </AppFrame>
        </Providers>
      </body>
    </html>
  );
}
