'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'easymde/dist/easymde.min.css';

// Dynamic import to avoid SSR issues with EasyMDE (which uses window)
const SimpleMDE = dynamic(() => import('react-simplemde-editor'), {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
});

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    autofocus?: boolean;
}

export default function MarkdownEditor({ value, onChange, placeholder, minHeight = "300px", autofocus = false }: MarkdownEditorProps) {
    const options = useMemo(() => {
        return {
            spellChecker: false,
            status: false,
            placeholder: placeholder || 'Type markdown here...',
            minHeight: minHeight,
            autofocus: autofocus,
        };
    }, [placeholder, minHeight, autofocus]);

    return (
        <div className="markdown-editor-wrapper">
            <SimpleMDE
                value={value}
                onChange={onChange}
                options={options}
            />
        </div>
    );
}
