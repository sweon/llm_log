'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Storage, LogData } from '@/lib/storage';
import dynamic from 'next/dynamic';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), { ssr: false });

interface LogFormProps {
    initialData?: LogData;
}

export default function LogForm({ initialData }: LogFormProps) {
    const router = useRouter();
    const [title, setTitle] = useState(initialData?.title || '');
    const [model, setModel] = useState(initialData?.model || '');
    const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
    const [content, setContent] = useState(initialData?.content || '');

    const [availableModels, setAvailableModels] = useState<string[]>([]);

    useEffect(() => {
        // Load models
        const models = Storage.getModels();
        setAvailableModels(models.reverse());

        // If editing and model is custom/legacy, ensure it shows up (though select might just show value if we allow custom?)
        // The select logic in original main.js handled custom values by adding a dynamic option. 
        // Here we can just allow the select to hold the value even if not in options, or add it to options list temporarily.
        if (initialData?.model && !models.includes(initialData.model)) {
            setAvailableModels(prev => [initialData.model, ...prev]);
        }
    }, [initialData]);

    const handleSave = () => {
        if (!title.trim() && !content.trim()) {
            alert('Please enter at least a title or content.');
            return;
        }

        const logData: Partial<LogData> = {
            id: initialData?.id, // undefined for new
            title: title.trim(),
            model: model,
            tags: tags.split(',').map(t => t.trim()).filter(t => t),
            content: content
        };

        const savedLog = Storage.save(logData);
        window.dispatchEvent(new Event('logs-updated')); // Trigger Sidebar update

        router.push(`/log?id=${savedLog.id}`);
    };

    const handleCancel = () => {
        if (initialData?.id) {
            router.push(`/log?id=${initialData.id}`);
        } else {
            router.push('/');
        }
    };

    return (
        <div id="editor-view" className="">
            <div className="editor-header">
                <input
                    type="text"
                    id="edit-title"
                    placeholder="Untitled Log"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <div className="editor-actions">
                    <button id="btn-cancel" onClick={handleCancel}>Cancel</button>
                    <button id="btn-save" className="btn-primary" onClick={handleSave}>Save</button>
                </div>
            </div>

            <div className="editor-meta">
                <select
                    id="edit-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                >
                    <option value="" disabled>Select Model</option>
                    {availableModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <input
                    type="text"
                    id="edit-tags"
                    placeholder="Tags (comma separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                />
            </div>

            <div className="h-[calc(100vh-200px)] border border-gray-200 rounded">
                <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Paste conversation or start writing..."
                    minHeight="100%"
                    autofocus={true}
                />
            </div>
        </div>
    );
}
