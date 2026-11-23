import { useEffect, useState } from 'react';

export function useMedia(query: string): boolean {
    const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const m = window.matchMedia(query);
        const on = () => setMatch(m.matches);
        on();
        m.addEventListener('change', on);
        return () => m.removeEventListener('change', on);
    }, [query]);
    return match;
}
