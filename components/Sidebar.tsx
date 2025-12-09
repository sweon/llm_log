'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Storage, LogData } from '@/lib/storage';
import ThemeToggle from './ThemeToggle';

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [logs, setLogs] = useState<LogData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'model'>('date');
    const [isRefreshing, setIsRefreshing] = useState(false); // Helper to force re-render

    useEffect(() => {
        // Initial load
        refreshList();

        // Listen for custom event 'storage-update' if we implement it, 
        // or just rely on manual refresh triggers?
        // Since we are moving to App Router, we might need a context or event bus.
        // For now, let's look for a simple window event or polling? 
        // Actually, let's keep it simple: parent pages might trigger refresh if we hoist state,
        // but Sidebar is self-contained here. 
        // Let's add an event listener for "logs-updated".
        const handleUpdate = () => refreshList();
        window.addEventListener('logs-updated', handleUpdate);
        return () => window.removeEventListener('logs-updated', handleUpdate);
    }, [searchQuery, sortBy]);

    const refreshList = () => {
        const results = Storage.search(searchQuery, sortBy);
        setLogs(results);
    };

    // We need to wrap Sidebar in Suspense or handle useSearchParams carefully.
    // For simplicity in this static export, we can check searchParams if we add Suspense boundary in Layout,
    // OR just link to /log?id=... and highlight based on URL.
    // But strictly speaking, Sidebar is in RootLayout. RootLayout cannot easy be Suspensed.
    // We'll use a client-side check that doesn't trigger deopt/suspense requirement if possible, or just accept it.
    // Actually, useSearchParams() in a Client Component that is imported in Layout *might* cause issues.
    // Let's stick to simple link rendering and maybe skip active class highlighting based on ID for a moment if it causes build issues, 
    // OR use window.location.search inside useEffect to avoid SSR issues.

    const [currentId, setCurrentId] = useState<string | null>(null);

    // Better:
    const searchParams = useSearchParams();
    useEffect(() => {
        setCurrentId(searchParams.get('id'));
    }, [searchParams]);

    const handleExport = () => {
        const data = Storage.export();
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `llm_logs_backup_${dateStr}.json`;
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const count = Storage.import(text);
        alert(`Imported ${count} logs.`);
        refreshList();
        window.dispatchEvent(new Event('logs-updated'));
    };

    return (
        <aside id="sidebar">
            <div className="sidebar-header">
                <Link href="/new">
                    <button className="btn-primary w-full">+ New Log</button>
                </Link>

                <div className="search-container">
                    <input
                        type="text"
                        id="search-input"
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-container">
                    <select
                        id="sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                    >
                        <option value="date">Sort by Date</option>
                        <option value="title">Sort by Title</option>
                        <option value="model">Sort by Model</option>
                    </select>
                </div>

                <div className="data-actions">
                    {/* Models management could be a separate page or modal. Let's just link to it for now? */}
                    {/* For MVP, maybe skip discrete model management UI in sidebar or add specific button later. */}
                    {/* Let's keep existing buttons */}
                    <button onClick={handleExport} className="btn-sm">Export</button>
                    <label className="btn-sm cursor-pointer">
                        Import
                        <input type="file" onChange={handleImport} accept=".json" className="hidden" />
                    </label>
                    <ThemeToggle />
                </div>
            </div>

            <ul id="log-list">
                {logs.map(log => (
                    <li key={log.id} className={`log-item ${currentId === log.id ? 'active' : ''}`}>
                        <Link href={`/log?id=${log.id}`} className="block h-full w-full">
                            <h3>{log.title || 'Untitled'}</h3>
                            <p>{new Date(log.createdAt).toLocaleDateString()} • {log.model || 'No Model'}</p>
                        </Link>
                    </li>
                ))}
                {logs.length === 0 && (
                    <li className="p-4 text-center text-gray-500 text-sm">No logs found</li>
                )}
            </ul>
        </aside>
    );
}
