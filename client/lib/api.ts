const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function runAgent(query: string, token?: string) {
    console.log("DEBUG: API_URL:", API_URL)
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/agent/run?query=${encodeURIComponent(query)}`, {
        method: 'POST',
        headers,
    });
    if (!res.ok) throw new Error('Failed to run agent');
    return res.json();
}

export async function sendFeedback(threadId: string, action: 'COMMIT' | 'UPDATE', feedback?: string, token?: string) {
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/agent/feedback?thread_id=${threadId}&action=${action}${feedback ? `&feedback=${encodeURIComponent(feedback)}` : ''}`, {
        method: 'POST',
        headers,
    });
    if (!res.ok) throw new Error('Failed to send feedback');
    return res.json();
}

export async function uploadFile(file: File, token?: string) {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
}
