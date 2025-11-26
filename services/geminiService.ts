import { GoogleGenAI, Type, Schema, Part } from "@google/genai";
import { AnswerKeyItem, FileWithContent, StudentResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-2.5-flash';

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------
// 1. Generate Answer Key & Parameters
// ---------------------------------------------------------

export const generateAnswerKey = async (questionsText: string, questionFiles: FileWithContent[] = []): Promise<AnswerKeyItem[]> => {
  const systemPrompt = `
    You are the **Booklet Review System**.
    
    OBJECTIVE:
    Analyze the input questions (text/images/PDF) and generate a robust Answer Key for automated grading.

    REQUIREMENTS:
    1. **Identify**: Extract every question clearly from the provided text or files.
    2. **Ideal Answer**: Generate a complete, step-by-step perfect solution.
       - Numerical: Show Formula + Steps + Result.
       - Coding: Optimized clean code.
       - Theory: Key concepts and required keywords.
    3. **Dynamic Parameters**: Create 2-5 granular evaluation parameters per question.
       - **CRITICAL**: Design parameters to enable PARTIAL CREDIT (e.g., use "Formula", "Method", "Calculation", "Final Answer" instead of just "Correctness").
    4. **Weightage**: Assign logical marks to each parameter.
    5. **Type**: Classify as 'Numerical', 'Theory', 'Coding', 'Diagram', or 'Other'.

    OUTPUT:
    JSON Array of objects matching the schema.
  `;

  const userParts: Part[] = [
    { text: systemPrompt }
  ];

  if (questionsText.trim()) {
    userParts.push({ text: `Question Text Input:\n${questionsText}` });
  }

  // Add file parts (images/pdfs of questions)
  questionFiles.forEach(file => {
    userParts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.content,
      }
    });
  });

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        question_no: { type: Type.INTEGER },
        question_text: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['Numerical', 'Theory', 'Coding', 'Diagram', 'Other'] },
        ideal_answer: { type: Type.STRING },
        parameters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              weightage: { type: Type.NUMBER },
            },
            required: ['name', 'weightage'],
          },
        },
      },
      required: ['question_no', 'question_text', 'type', 'ideal_answer', 'parameters'],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: userParts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnswerKeyItem[];
    }
    throw new Error("No text returned from Gemini");
  } catch (error) {
    console.error("Error generating answer key:", error);
    throw error;
  }
};

// ---------------------------------------------------------
// 2. Grade Student Submission
// ---------------------------------------------------------

export const gradeStudentSubmission = async (
  file: FileWithContent,
  answerKey: AnswerKeyItem[]
): Promise<StudentResult> => {
  const answerKeyString = JSON.stringify(answerKey, null, 2);
  
  const prompt = `
    You are the **Booklet Review System**, an expert autonomous grader.

    ### CORE DIRECTIVE: PREVENT FALSE ZEROES & ENSURE ACCURACY
    You are evaluating a student's answer booklet. You must make every effort to find their answer and award legitimate marks.
    
    ### RULES:
    1. **OCR & Extraction**: The input is a raw document (PDF/Image). You MUST internally perform OCR to read all handwritten or printed text.
    2. **Answer Mapping**: The student might not number answers clearly. Use context matching to map student text to the correct Question Number.
    3. **Partial Credit & Scoring**:
       - **DO NOT** award 0 just because the final answer is wrong.
       - Award marks for: Correct formulas, correct logic/approach, valid definitions, partial steps.
       - **total_score** must be the sum of valid parameter scores.
       - **max_score** must be the sum of parameter weightages from the Answer Key (total_marks_available).
       - Only award 0 if the answer is completely blank or completely unrelated.
    4. **Evaluation**: Compare the extracted student response against the [ANSWER KEY] using the specific [PARAMETERS].
    5. **Remark**: Provide a specific, constructive reason for the score.

    [ANSWER KEY & PARAMETERS]
    ${answerKeyString}

    ### OUTPUT
    Return a JSON object with the student's evaluation results.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      student_id: { type: Type.STRING, description: "Extract student name/ID if visible, otherwise use filename" },
      evaluations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question_no: { type: Type.INTEGER },
            parameter_scores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['name', 'score']
              }
            },
            total_score: { type: Type.NUMBER, description: "Sum of parameter_scores (marks obtained)" },
            max_score: { type: Type.NUMBER, description: "Sum of parameter weightages (marks available)" },
            remark: { type: Type.STRING },
          },
          required: ['question_no', 'parameter_scores', 'total_score', 'max_score', 'remark']
        }
      }
    },
    required: ['student_id', 'evaluations']
  };

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { text: `Filename: ${file.file.name}` },
              {
                inlineData: {
                  mimeType: file.mimeType,
                  data: file.content,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      if (response.text) {
        const result = JSON.parse(response.text) as StudentResult;
        if (!result.student_id || result.student_id === 'unknown') {
          result.student_id = file.file.name;
        }
        return result;
      }
      throw new Error("No grading response from Gemini");

    } catch (error: any) {
      // Handle Rate Limits (429) or Overload (503)
      const isRateLimit = error.message?.includes('429') || error.status === 429 || error.code === 429;
      const isOverloaded = error.message?.includes('503') || error.status === 503;

      if ((isRateLimit || isOverloaded) && attempts < maxAttempts) {
        console.warn(`Attempt ${attempts} failed for ${file.file.name}. Retrying in ${attempts * 5}s...`);
        await delay(attempts * 5000); // Backoff: 5s, 10s
        continue;
      }

      // Handle File Size Limits (400)
      // Example error: "Document size exceeds supported limit: 54874064 v.s 52428800"
      if (error.message?.includes('exceeds supported limit') || error.status === 400) {
        console.error(`File too large: ${file.file.name}`);
        return {
          student_id: file.file.name,
          evaluations: [{
            question_no: 0,
            parameter_scores: [],
            total_score: 0,
            max_score: 0,
            remark: "ERROR: File size exceeds API limit (50MB). Evaluation skipped."
          }]
        };
      }

      console.error(`Error grading file ${file.file.name}:`, error);
      return {
        student_id: file.file.name,
        evaluations: [{
          question_no: 0,
          parameter_scores: [],
          total_score: 0,
          max_score: 0,
          remark: `ERROR: Processing failed. ${error.message || 'Unknown error'}`
        }],
      };
    }
  }

  // If we exhausted retries
  return {
    student_id: file.file.name,
    evaluations: [{
      question_no: 0,
      parameter_scores: [],
      total_score: 0,
      max_score: 0,
      remark: "ERROR: System timeout or rate limit exceeded after retries."
    }],
  };
};