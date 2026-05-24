export interface QuizItem {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  page_number: number;
  chunk_id: string;
}

export type AppPhase =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

export interface JobResponse {
  job_id: string;
  status: string;
}

export interface StreamCallbacks {
  onProgress: (message: string) => void;
  onCompleted: (quizzes: QuizItem[]) => void;
  onFailed: (error: string) => void;
}
