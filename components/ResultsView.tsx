import React from 'react';
import { StudentResult, AnswerKeyItem } from '../types';
import { FileSpreadsheet, AlertCircle } from 'lucide-react';

interface ResultsViewProps {
  results: StudentResult[];
  answerKey: AnswerKeyItem[];
}

export const ResultsView: React.FC<ResultsViewProps> = ({ results, answerKey }) => {
  
  const generateCSV = () => {
    // Header Row
    // Standard columns required by strict schema
    let headers = ['student_id', 'question_no'];
    
    // Find max params for any question to create dynamic columns
    const maxParams = answerKey.reduce((max, q) => Math.max(max, q.parameters.length), 0);
    
    for (let i = 1; i <= maxParams; i++) {
        // Using 'marks' instead of 'score' as per prompt requirement
        headers.push(`parameter_${i}_name`, `parameter_${i}_marks`);
    }

    // Add strict ending columns
    headers.push('total_score', 'total_marks_obtained', 'total_marks_available', 'remark');

    let csvContent = headers.join(',') + '\n';

    results.forEach(student => {
      student.evaluations.forEach(evaluation => {
        const row: (string | number)[] = [
            `"${student.student_id}"`,
            evaluation.question_no
        ];
        
        // Add parameters
        for (let i = 0; i < maxParams; i++) {
            const param = evaluation.parameter_scores[i];
            if (param) {
                row.push(`"${param.name}"`, param.score);
            } else {
                row.push('""', '""'); // Empty if this question has fewer params
            }
        }

        // Add totals and remark
        // total_score and total_marks_obtained are the same, mapped from evaluation.total_score
        // total_marks_available is mapped from evaluation.max_score
        row.push(
            evaluation.total_score, 
            evaluation.total_score, 
            evaluation.max_score, 
            `"${evaluation.remark.replace(/"/g, '""')}"`
        ); 
        
        csvContent += row.join(',') + '\n';
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'grading_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Evaluation Complete</h2>
          <p className="text-slate-500 mt-1">
            Processed <span className="font-semibold text-slate-900">{results.length}</span> student booklets.
          </p>
        </div>
        <button
          onClick={generateCSV}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-sm"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Download CSV Report
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Sample Preview (First 5 Records)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 w-32">Student ID</th>
                <th className="px-6 py-3 w-16">Q#</th>
                <th className="px-6 py-3">Obtained / Available</th>
                <th className="px-6 py-3">Breakdown</th>
                <th className="px-6 py-3">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.slice(0, 5).map((student, sIdx) => (
                <React.Fragment key={sIdx}>
                  {student.evaluations.map((evalItem, eIdx) => (
                    <tr key={`${sIdx}-${eIdx}`} className="hover:bg-slate-50">
                      {eIdx === 0 && (
                        <td className="px-6 py-4 font-medium text-slate-900 align-top" rowSpan={student.evaluations.length}>
                          {student.student_id}
                        </td>
                      )}
                      <td className="px-6 py-4 font-mono text-slate-600 align-top">Q{evalItem.question_no}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 align-top">
                        {evalItem.total_score} <span className="text-slate-400 font-normal">/ {evalItem.max_score}</span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {evalItem.parameter_scores.map((p, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {p.name}: {p.score}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 italic align-top">
                        "{evalItem.remark}"
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {results.length === 0 && (
             <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                 <AlertCircle className="w-8 h-8 mb-2 text-slate-300"/>
                 No results generated. Check API key or inputs.
             </div>
        )}
      </div>
    </div>
  );
};