import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Remnants',
    description: 'A text-based online RPG',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
