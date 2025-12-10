'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Storage, LogData } from '@/lib/storage';
import LogForm from '@/components/LogForm';

function EditContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const [log, setLog] = useState<LogData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            const data = Storage.get(id);
            if (data) {
                setLog(data);
            }
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!id) return <div>No ID provided</div>;
    if (!log) return <div>Log not found</div>;

    return <LogForm initialData={log} />;
}

export default function EditLogPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EditContent />
        </Suspense>
    );
}
