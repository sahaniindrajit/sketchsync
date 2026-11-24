import animate from 'tailwindcss-animate';
import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Geist Variable"', ...defaultTheme.fontFamily.sans],
                mono: ['"Geist Mono Variable"', ...defaultTheme.fontFamily.mono],
                canvas: ['Inter', ...defaultTheme.fontFamily.sans],
                display: ['"Bricolage Grotesque Variable"', '"Geist Variable"', ...defaultTheme.fontFamily.sans],
            },
            letterSpacing: {
                display: '-0.045em',
                tightish: '-0.02em',
            },
            borderRadius: {
                xl: 'calc(var(--radius) + 4px)',
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 3px)',
                sm: 'calc(var(--radius) - 6px)',
            },
            boxShadow: {
                chrome: '0 1px 0 hsl(var(--foreground) / 0.03), 0 10px 30px -12px hsl(225 20% 10% / 0.22), 0 2px 6px -2px hsl(225 20% 10% / 0.08)',
                lift: '0 24px 60px -24px hsl(225 20% 10% / 0.35)',
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
                popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
                primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
                secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
                muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
                accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
                destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
                claude: 'hsl(var(--claude))',
                success: 'hsl(var(--success))',
                warning: 'hsl(var(--warning))',
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            keyframes: {
                shimmer: { from: { backgroundPosition: '100% 0' }, to: { backgroundPosition: '-100% 0' } },
                sheen: { '0%, 55%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(120%)' } },
                ping2: { '0%': { boxShadow: '0 0 0 0 hsl(var(--claude) / 0.55)' }, '100%': { boxShadow: '0 0 0 8px hsl(var(--claude) / 0)' } },
                marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(calc(-50% - 0.5rem))' } },
                blink: { '50%': { opacity: '0' } },
            },
            animation: {
                shimmer: 'shimmer 2.2s linear infinite',
                sheen: 'sheen 3.8s ease-in-out infinite 1.5s',
                ping2: 'ping2 1.8s ease-out infinite',
                marquee: 'marquee 40s linear infinite',
                blink: 'blink 1s step-end infinite',
            },
        },
    },
    plugins: [animate],
};
