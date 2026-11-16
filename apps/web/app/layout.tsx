import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = { title: 'Amigo Doce', description: 'Um encontro especial começa com uma surpresa.', robots: { index: false, follow: false } };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
