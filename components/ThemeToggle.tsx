'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button onClick={toggleTheme} className="btn-sm" title="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    );
}
