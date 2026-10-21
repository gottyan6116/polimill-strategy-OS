import "./globals.css";
import "./theme.css";
export const metadata = {
  title: "Polimill Strategy OS",
  description: "組織の目標と実行をつなぐ経営管理ワークスペース",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
