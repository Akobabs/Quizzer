interface ProgressStatusProps {
  messages: string[];
}

const STEP_LABELS = [
  "Extracting PDF pages",
  "Chunking content",
  "Generating questions",
  "Finalizing results",
];

function detectStep(messages: string[]): number {
  const joined = messages.join(" ").toLowerCase();
  if (joined.includes("finaliz")) return 3;
  if (joined.includes("generat")) return 2;
  if (joined.includes("chunk")) return 1;
  if (joined.includes("extract") || joined.includes("starting")) return 0;
  return 0;
}

export default function ProgressStatus({ messages }: ProgressStatusProps) {
  const currentStep = detectStep(messages);

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="relative">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
        </div>
        <div>
          <p className="font-semibold text-white">Generating your quiz</p>
          <p className="text-slate-500 text-sm">This may take a minute depending on PDF size</p>
        </div>
      </div>

      {/* Step progress */}
      <div className="space-y-3 mb-8">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            <div
              className={`h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i < currentStep
                  ? "bg-indigo-500 text-white"
                  : i === currentStep
                  ? "bg-indigo-500/20 border-2 border-indigo-500 text-indigo-400"
                  : "bg-slate-800 border border-slate-700 text-slate-600"
                }`}
            >
              {i < currentStep ? (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-sm transition-colors ${
                i <= currentStep ? "text-slate-200" : "text-slate-600"
              }`}
            >
              {label}
              {i === currentStep && (
                <span className="ml-2 text-indigo-400 text-xs">in progress…</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Live log */}
      {messages.length > 0 && (
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
          <p className="text-slate-500 text-xs font-mono mb-2">LIVE LOG</p>
          <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {messages.map((msg, i) => (
              <p key={i} className="text-slate-400 text-xs font-mono">
                <span className="text-indigo-500 mr-2">›</span>
                {msg}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
