export interface EvaluationParameter {
  name: string;
  weightage: number; // The maximum marks for this parameter
}

export interface AnswerKeyItem {
  question_no: number;
  question_text: string;
  type: 'Numerical' | 'Theory' | 'Coding' | 'Diagram' | 'Other';
  ideal_answer: string;
  parameters: EvaluationParameter[];
}

export interface ParameterScore {
  name: string;
  score: number;
}

export interface GradedQuestion {
  question_no: number;
  parameter_scores: ParameterScore[];
  total_score: number;
  max_score: number;
  remark: string;
}

export interface StudentResult {
  student_id: string; // derived from filename
  evaluations: GradedQuestion[];
}

export type AppStep = 'UPLOAD' | 'ANALYZING_QUESTIONS' | 'GRADING' | 'RESULTS';

export interface FileWithContent {
  file: File;
  content: string; // Base64
  mimeType: string;
}