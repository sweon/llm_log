'use client';

import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { markedHighlight } from "marked-highlight";
import markedKatex from 'marked-katex-extension';
import 'katex/dist/katex.min.css';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import latex from 'highlight.js/lib/languages/latex';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import markdownDisplay from 'highlight.js/lib/languages/markdown'; // renamed to avoid collision

// Register Languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('latex', latex);
hljs.registerLanguage('tex', latex);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('markdown', markdownDisplay);

// Global Config
marked.use(
    markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (e) { }
            }
            try {
                return hljs.highlightAuto(code).value;
            } catch (e) {
                return '';
            }
        }
    })
);

marked.use({ breaks: true, gfm: true });
marked.use(markedKatex({ throwOnError: false }));

// Custom Renderer
const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }) => {
    return `<a target="_blank" href="${href}" title="${title || ''}">${text}</a>`;
};
marked.use({ renderer });

export default function MarkdownViewer({ content }: { content: string }) {
    const [html, setHtml] = useState('');

    useEffect(() => {
        const parse = async () => {
            const parsed = await marked.parse(content || '');
            setHtml(parsed);
        };
        parse();
    }, [content]);

    return (
        <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
