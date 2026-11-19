import { tercet } from "@/tercet";

const { Layout, metadata, viewport } = tercet.layout;
export { metadata, viewport };

// No next/font here: the theme's font stack is used.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}
