import React, { useState, useRef } from 'react';
import { BookCheck, CheckCircle, Loader2, ChevronRight, FileText, Database, Play, Upload } from 'lucide-react';
import { generateAnswerKey, gradeStudentSubmission } from './services/geminiService';
import { FileUpload } from './components/FileUpload';
import { AnswerKeyDisplay } from './components/AnswerKeyDisplay';
import { ResultsView } from './components/ResultsView';
import { AnswerKeyItem, AppStep, StudentResult, FileWithContent } from './types';

// Helper to read file as Base64
const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data URL prefix (e.g. "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function App() {
  const [step, setStep] = useState<AppStep>('UPLOAD');
  
  // Input States
  const [questionsText, setQuestionsText] = useState<string>('');
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [studentFiles, setStudentFiles] = useState<File[]>([]);
  
  // Data States
  const [answerKey, setAnswerKey] = useState<AnswerKeyItem[]>([]);
  const [gradingResults, setGradingResults] = useState<StudentResult[]>([]);
  
  // Loading States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState<{current: number, total: number}>({ current: 0, total: 0 });

  // Phase 1: Generate Answer Key
  const handleAnalyzeQuestions = async () => {
    if (!questionsText.trim() && questionFiles.length === 0) {
      return alert("Please provide questions via text or file upload.");
    }
    
    setIsAnalyzing(true);
    setStep('ANALYZING_QUESTIONS');
    
    try {
      // Prepare question files
      const processedQuestionFiles: FileWithContent[] = [];
      for (const file of questionFiles) {
        const base64 = await readFileAsBase64(file);
        processedQuestionFiles.push({
          file,
          content: base64,
          mimeType: file.type
        });
      }

      const key = await generateAnswerKey(questionsText, processedQuestionFiles);
      setAnswerKey(key);
      setStep('GRADING'); 
    } catch (error) {
      console.error(error);
      alert("System Error: Failed to generate answer key. Ensure API Key is active and input is valid.");
      setStep('UPLOAD');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Phase 2: Grade Students
  const handleStartGrading = async () => {
    if (studentFiles.length === 0) return alert("No student booklets uploaded.");
    
    setIsGrading(true);
    setGradingProgress({ current: 0, total: studentFiles.length });
    
    const results: StudentResult[] = [];

    try {
        for (let i = 0; i < studentFiles.length; i++) {
            setGradingProgress({ current: i + 1, total: studentFiles.length });
            const file = studentFiles[i];
            
            try {
                const base64Content = await readFileAsBase64(file);
                
                const fileWithContent: FileWithContent = {
                    file: file,
                    content: base64Content,
                    mimeType: file.type
                };

                const result = await gradeStudentSubmission(fileWithContent, answerKey);
                results.push(result);

                // Rate Limit Safety Buffer
                // Wait 2.5 seconds between requests to prevent API exhaustion (429 errors)
                if (i < studentFiles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2500));
                }

            } catch (err) {
                console.error("Error reading file", file.name, err);
                // Push a failed result so it appears in the CSV/Report
                results.push({
                    student_id: file.name,
                    evaluations: [{
                        question_no: 0,
                        parameter_scores: [],
                        total_score: 0,
                        max_score: 0,
                        remark: "ERROR: File read error or client-side failure."
                    }]
                });
            }
        }
        
        setGradingResults(results);
        setStep('RESULTS');
    } catch (error) {
        console.error(error);
        alert("Critical error during grading process.");
    } finally {
        setIsGrading(false);
    }
  };

  const resetSystem = () => {
    setStep('UPLOAD');
    setQuestionsText('');
    setQuestionFiles([]);
    setStudentFiles([]);
    setAnswerKey([]);
    setGradingResults([]);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="text-blue-600">
              <BookCheck size={28} strokeWidth={2.5} />
            </div>
            <div>
               <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Booklet Review System</h1>
               <p className="text-[10px] font-medium text-slate-500 tracking-wider uppercase">High-Speed Evaluation Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-6 text-xs md:text-sm font-medium text-slate-400">
             <span className={`flex items-center gap-2 ${step === 'UPLOAD' ? 'text-blue-600' : ''}`}>
               <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">1</span>
               <span className="hidden md:inline">Input</span>
             </span>
             <div className="w-8 h-px bg-slate-200"></div>
             <span className={`flex items-center gap-2 ${step === 'ANALYZING_QUESTIONS' || step === 'GRADING' ? 'text-blue-600' : ''}`}>
               <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">2</span>
               <span className="hidden md:inline">Analyze</span>
             </span>
             <div className="w-8 h-px bg-slate-200"></div>
             <span className={`flex items-center gap-2 ${step === 'RESULTS' ? 'text-blue-600' : ''}`}>
               <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">3</span>
               <span className="hidden md:inline">Report</span>
             </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 mt-8">
        
        {/* STEP 1: INPUT */}
        {step === 'UPLOAD' && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Left Col: Questions */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-100 p-1.5 rounded text-blue-600">
                     <FileText size={18} />
                  </div>
                  <h2 className="font-semibold text-slate-800">Question Source</h2>
               </div>
               
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Option A: Text Input</label>
                   <textarea
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm font-mono leading-relaxed text-slate-700 placeholder:text-slate-400 transition-all"
                    placeholder="1. Define gravity.&#10;2. Solve 2x + 4 = 10."
                    value={questionsText}
                    onChange={(e) => setQuestionsText(e.target.value)}
                   />
                 </div>
                 
                 <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-2 text-xs text-slate-400 uppercase font-medium">OR</span>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Option B: Upload File</label>
                    <FileUpload 
                      files={questionFiles} 
                      setFiles={setQuestionFiles} 
                      label="Upload Question Paper"
                      description="PDF, JPG, PNG"
                    />
                 </div>
               </div>
            </div>

            {/* Right Col: Students & Action */}
            <div className="space-y-4 flex flex-col">
               <div className="flex items-center gap-2 mb-2">
                  <div className="bg-emerald-100 p-1.5 rounded text-emerald-600">
                     <Database size={18} />
                  </div>
                  <h2 className="font-semibold text-slate-800">Student Booklets</h2>
               </div>

               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-grow">
                  <FileUpload 
                    files={studentFiles} 
                    setFiles={setStudentFiles} 
                    label="Upload Answer Booklets"
                    description="Bulk Upload (PDF, Images)"
                  />
               </div>

               <button
                onClick={handleAnalyzeQuestions}
                disabled={(!questionsText && questionFiles.length === 0) || isAnalyzing}
                className="w-full mt-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing System...
                  </>
                ) : (
                  <>
                    Initialize Review System
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: REVIEW & EXECUTE */}
        {(step === 'ANALYZING_QUESTIONS' || step === 'GRADING') && (
           <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
             
             {step === 'ANALYZING_QUESTIONS' && (
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                   <div className="relative">
                     <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                       <BookCheck className="w-6 h-6 text-blue-600" />
                     </div>
                   </div>
                   <div className="text-center">
                     <h3 className="text-xl font-bold text-slate-800">Autonomous Analysis Active</h3>
                     <p className="text-slate-500 mt-2">Generating answer key and evaluation parameters...</p>
                   </div>
                </div>
             )}

             {step === 'GRADING' && (
               <div className="grid lg:grid-cols-12 gap-8">
                  
                  {/* Grading Dashboard - Left */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
                       <div className="flex items-center gap-3">
                         <div className="bg-green-100 p-2 rounded-full">
                           <CheckCircle className="w-5 h-5 text-green-600" />
                         </div>
                         <div>
                           <h3 className="font-bold text-slate-800">System Ready</h3>
                           <p className="text-xs text-slate-500">Answer Key generated. Ready to evaluate {studentFiles.length} booklets.</p>
                         </div>
                       </div>
                       <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-mono font-medium">
                         v2.1 Fast Mode
                       </span>
                    </div>
                    
                    <AnswerKeyDisplay answerKey={answerKey} />
                  </div>

                  {/* Control Panel - Right */}
                  <div className="lg:col-span-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 sticky top-24 shadow-lg shadow-slate-100">
                      <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Operation Control</h3>
                      
                      <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                           <span className="text-xs font-semibold text-slate-500 uppercase">Questions</span>
                           <span className="font-mono font-bold text-slate-900">{answerKey.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                           <span className="text-xs font-semibold text-slate-500 uppercase">Booklets</span>
                           <span className="font-mono font-bold text-slate-900">{studentFiles.length}</span>
                        </div>
                      </div>

                      {isGrading ? (
                        <div className="space-y-4">
                           <div className="flex justify-between text-xs font-medium text-slate-500">
                             <span>Progress</span>
                             <span>{Math.round((gradingProgress.current / gradingProgress.total) * 100)}%</span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                             <div 
                               className="bg-blue-600 h-full transition-all duration-300 ease-out" 
                               style={{ width: `${(gradingProgress.current / gradingProgress.total) * 100}%` }}
                             ></div>
                           </div>
                           <p className="text-xs text-center text-slate-400 animate-pulse">
                             Evaluating booklet {gradingProgress.current}/{gradingProgress.total}...
                           </p>
                        </div>
                      ) : (
                        <button
                          onClick={handleStartGrading}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-4 rounded-lg font-bold transition-colors shadow-md shadow-blue-200"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Start Auto-Evaluation
                        </button>
                      )}
                    </div>
                  </div>
               </div>
             )}
           </div>
        )}

        {/* STEP 3: REPORT */}
        {step === 'RESULTS' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <ResultsView results={gradingResults} answerKey={answerKey} />
             <div className="mt-12 flex justify-center">
                <button 
                  onClick={resetSystem}
                  className="text-slate-400 hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload New Batch
                </button>
             </div>
           </div>
        )}

      </main>
    </div>
  );
}

export default App;