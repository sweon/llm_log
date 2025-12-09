'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Storage, LogData, Comment } from '@/lib/storage';
import MarkdownViewer from '@/components/MarkdownViewer';
import dynamic from 'next/dynamic';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), { ssr: false });

function ViewerContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');
    const [log, setLog] = useState<LogData | null>(null);
    const [showDelete, setShowDelete] = useState(false);

    // Comments state
    const [commentText, setCommentText] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (id) {
            const data = Storage.get(id);
            if (data) {
                setLog(data);
            } else {
                // Optionally redirect or stay?
            }
        }
        setInitialized(true);
    }, [id]);

    const handleDelete = () => {
        if (log) {
            Storage.delete(log.id);
            window.dispatchEvent(new Event('logs-updated'));
            router.push('/');
        }
    };

    const handleAddComment = () => {
        if (!log || !commentText.trim()) return;

        const updatedLog = { ...log };
        if (!updatedLog.comments) updatedLog.comments = [];

        if (editingCommentId) {
            // Update existing
            const idx = updatedLog.comments.findIndex(c => c.id === editingCommentId);
            if (idx !== -1) {
                updatedLog.comments[idx].text = commentText;
            }
            setEditingCommentId(null);
        } else {
            // Add new
            updatedLog.comments.push({
                id: crypto.randomUUID(),
                text: commentText,
                createdAt: new Date().toISOString()
            });
        }

        Storage.save(updatedLog);
        setLog(updatedLog);
        setCommentText('');
    };

    const handleEditComment = (comment: Comment) => {
        setCommentText(comment.text);
        setEditingCommentId(comment.id);
        document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDeleteComment = (commentId: string) => {
        if (!log || !log.comments) return;
        if (!confirm('Delete comment?')) return;

        const updatedLog = { ...log };
        if (!updatedLog.comments) return;

        updatedLog.comments = updatedLog.comments.filter(c => c.id !== commentId);

        Storage.save(updatedLog);
        setLog(updatedLog);
        if (editingCommentId === commentId) {
            setEditingCommentId(null);
            setCommentText('');
        }
    };

    const handleCancelComment = () => {
        setEditingCommentId(null);
        setCommentText('');
    };

    if (!initialized) return null;
    if (!id) return <div className="p-8 text-center">No Log ID provided</div>;
    if (!log) return <div className="p-8 text-center">Log not found</div>;

    return (
        <div id="viewer-view">
            <div className="viewer-header">
                <h1 id="view-title">{log.title || 'Untitled'}</h1>
            </div>

            <div className="viewer-meta">
                <span id="view-date">{new Date(log.createdAt).toLocaleString()}</span>
                <span id="view-model">{log.model}</span>

                <div className="viewer-actions">
                    <Link href={`/edit?id=${log.id}`}>
                        <button id="btn-edit" className="btn-sm">Edit</button>
                    </Link>
                    <button onClick={() => setShowDelete(true)} id="btn-delete" className="btn-sm btn-danger">Delete</button>
                </div>

                <div id="view-tags">
                    {log.tags && log.tags.map((tag, i) => (
                        <span key={i}>{tag}</span>
                    ))}
                </div>
            </div>

            <div id="view-content">
                <MarkdownViewer content={log.content} />
            </div>

            <div className="comments-section" id="comments-section">
                <h3>Comments</h3>
                <ul id="comments-list">
                    {log.comments?.map(comment => (
                        <li key={comment.id} className="comment-item">
                            <div className="comment-meta">
                                <span>{new Date(comment.createdAt).toLocaleString()}</span>
                                <div className="comment-actions space-x-2">
                                    <button onClick={() => handleEditComment(comment)} className="btn-sm text-xs">Edit</button>
                                    <button onClick={() => handleDeleteComment(comment.id)} className="btn-sm btn-danger text-xs">Delete</button>
                                </div>
                            </div>
                            <div className="comment-text markdown-body">
                                <MarkdownViewer content={comment.text} />
                            </div>
                        </li>
                    ))}
                </ul>

                <div className="add-comment mt-4">
                    <div className="mb-2">
                        <MarkdownEditor
                            value={commentText}
                            onChange={setCommentText}
                            placeholder="Add a comment... (Markdown supported)"
                            minHeight="150px"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAddComment} className="btn-primary">
                            {editingCommentId ? 'Update Comment' : 'Add Comment'}
                        </button>
                        {editingCommentId && (
                            <button onClick={handleCancelComment} className="btn-sm">Cancel</button>
                        )}
                    </div>
                </div>
            </div>

            {showDelete && (
                <div id="delete-modal" className="modal">
                    <div className="modal-content">
                        <h2 id="modal-title">Delete Log</h2>
                        <p id="modal-message">Are you sure you want to delete this log? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button id="btn-modal-cancel" onClick={() => setShowDelete(false)}>Cancel</button>
                            <button id="btn-modal-confirm" className="btn-danger" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function LogViewerPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ViewerContent />
        </Suspense>
    );
}
