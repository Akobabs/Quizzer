import { useCallback, useRef, useState } from "react";
import { downloadCSV, generateQuiz, streamJobEvents } from "./services/api";
import type { AppPhase, QuizItem } from "./types";
import FileUpload from "./components/FileUpload";
import ProgressStatus from "./components/ProgressStatus";
import QuizCard from "./components/QuizCard";

interface AppState {
  phase: AppPhase;
  jobId: string | null;
  messages: string[];
  quizzes: QuizItem[];
  error: string | null;
}

const INITIAL_STATE: AppState = {
  phase: "idle",
  jobId: null,
  messages: [],
  quizzes: [],
  error: null,
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    cleanupRef.current?.();
    setState({ ...INITIAL_STATE, phase: "uploading" });

    try {
      const { job_id } = await generateQuiz(file);
      setState((prev) => ({ ...prev, phase: "processing", jobId: job_id }));

      cleanupRef.current = streamJobEvents(job_id, {
        onProgress: (message) =>
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, message],
          })),
        onCompleted: (quizzes) =>
          setState((prev) => ({ ...prev, phase: "completed", quizzes })),
        onFailed: (error) =>
          setState((prev) => ({ ...prev, phase: "failed", error })),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: "failed",
        error: err instanceof Error ? err.message : "Upload failed",
      }));
    }
  }, []);

  const handleReset = useCallback(() => {
    cleanupRef.current?.();
    setState(INITIAL_STATE);
  }, []);

  const handleDownload = useCallback(() => {
    if (state.jobId) downloadCSV(state.jobId).catch(console.error);
  }, [state.jobId]);

  const { phase, messages, quizzes, error } = state;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-indigo-400">Quiz</span>zer
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">AI quiz generation from PDFs</p>
          </div>

          {phase !== "idle" && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        {/* Upload / error phase */}
        {(phase === "idle" || phase === "failed") && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Generate a Quiz</h2>
              <p className="text-slate-400 mt-1 text-sm">
                Upload a PDF and our AI will generate multiple-choice questions from its content.
              </p>
            </div>
            <FileUpload
              onUpload={handleUpload}
              uploadError={error}
              disabled={false}
            />
          </section>
        )}

        {/* Uploading spinner */}
        {phase === "uploading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
            <div className="h-10 w-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <p className="text-slate-300 text-sm">Uploading PDF…</p>
          </div>
        )}

        {/* Processing phase */}
        {phase === "processing" && <ProgressStatus messages={messages} />}

        {/* Completed phase */}
        {phase === "completed" && (
          <section className="animate-fade-in space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {quizzes.length} Question{quizzes.length !== 1 ? "s" : ""} Ready
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Click any card to reveal the answer and explanation.
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-900/30 transition-all hover:bg-indigo-500 active:scale-[0.98]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV
              </button>
            </div>

            <div className="space-y-4">
              {quizzes.map((quiz, i) => (
                <QuizCard key={`${quiz.chunk_id}-${i}`} quiz={quiz} index={i + 1} />
              ))}
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={handleReset}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Generate another quiz →
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
