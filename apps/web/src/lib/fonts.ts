import { Martian_Mono, Public_Sans } from 'next/font/google';

export const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
});

export const martianMono = Martian_Mono({
  subsets: ['latin'],
  variable: '--font-martian-mono',
});

export const fontVariables = `${publicSans.variable} ${martianMono.variable}`;
