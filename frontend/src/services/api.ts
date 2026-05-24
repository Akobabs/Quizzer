import type { JobResponse, QuizItem, StreamCallbacks } from "../types";

const API_BASE = "/api";

export async function generateQuiz(file: File): Promise<JobResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let detail = "Upload failed";
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse error
    }
    throw new Error(detail);
  }

  return res.json();
}

/**
 * Open an SSE stream for job progress events.
 * Returns a cleanup function that closes the connection.
 */
export function streamJobEvents(
  jobId: string,
  callbacks: StreamCallbacks
): () => void {
  const es = new EventSource(`${API_BASE}/jobs/${jobId}/events`);

  es.onmessage = (evt) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(evt.data as string);
    } catch {
      return;
    }

    switch (data.type) {
      case "progress":
        callbacks.onProgress(data.message as string);
        break;
      case "completed":
        callbacks.onCompleted(data.quizzes as QuizItem[]);
        es.close();
        break;
      case "failed":
        callbacks.onFailed(data.error as string);
        es.close();
        break;
      case "ping":
        break;
    }
  };

  es.onerror = () => {
    callbacks.onFailed("Connection to server lost. Please try again.");
    es.close();
  };

  return () => es.close();
}

export async function downloadCSV(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/download`);
  if (!res.ok) throw new Error("CSV download failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quiz_${jobId.slice(0, 8)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
