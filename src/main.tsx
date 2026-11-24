import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/theme';
import { ensureAccount } from './lib/account';

// Check the sign-in in the background so pages know who's here as early as possible.
void ensureAccount();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <MotionConfig reducedMotion="user" transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.15 }}>
            <App />
        </MotionConfig>
    </StrictMode>,
);
