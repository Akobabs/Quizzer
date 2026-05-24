import { useState } from "react";
import type { QuizItem } from "../types";

interface QuizCardProps {
  quiz: QuizItem;
  index: number;
}

const OPTIONS = ["A", "B", "C", "D"] as const;
type Option = (typeof OPTIONS)[number];

function getOptionText(quiz: QuizItem, opt: Option): string {
  const key = `option_${opt.toLowerCase()}` as keyof QuizItem;
  return String(quiz[key] ?? "");
}

export default function QuizCard({ quiz, index }: QuizCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 animate-slide-up">
      {/* Question */}
      <div className="flex items-start gap-3 mb-5">
        <span className="flex-shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
          Q{index}
        </span>
        <p className="text-slate-800 font-medium leading-relaxed">{quiz.question}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
        {OPTIONS.map((opt) => {
          const isCorrect = quiz.answer === opt;
          const highlighted = revealed && isCorrect;
          return (
            <div
              key={opt}
              className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 transition-all
                ${highlighted
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-slate-50"
                }`}
            >
              <span
                className={`mt-0.5 flex-shrink-0 rounded-full text-[11px] font-bold w-5 h-5 flex items-center justify-center
                  ${highlighted
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-500"
                  }`}
              >
                {opt}
              </span>
              <span className={`text-sm leading-snug ${highlighted ? "text-emerald-800 font-medium" : "text-slate-700"}`}>
                {getOptionText(quiz, opt)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Explanation (when revealed) */}
      {revealed && quiz.explanation && quiz.explanation !== "N/A" && (
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 animate-fade-in">
          <p className="text-blue-800 text-sm">
            <span className="font-semibold">Explanation: </span>
            {quiz.explanation}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setRevealed((r) => !r)}
          className={`text-sm font-medium transition-colors
            ${revealed ? "text-slate-500 hover:text-slate-700" : "text-indigo-600 hover:text-indigo-800"}`}
        >
          {revealed ? "Hide answer" : "Show answer"}
        </button>
        <span className="text-xs text-slate-400">p. {quiz.page_number}</span>
      </div>
    </div>
  );
}
