import React from 'react';
import { AnswerKeyItem } from '../types';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface AnswerKeyDisplayProps {
  answerKey: AnswerKeyItem[];
}

export const AnswerKeyDisplay: React.FC<AnswerKeyDisplayProps> = ({ answerKey }) => {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          Generated Answer Key
        </h3>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
          AI Generated
        </span>
      </div>
      
      <div className="grid gap-3">
        {answerKey.map((item) => (
          <div key={item.question_no} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
            <div 
              onClick={() => toggleExpand(item.question_no)}
              className="flex items-center justify-between p-4 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-600 text-white text-sm font-bold rounded-full">
                  Q{item.question_no}
                </span>
                <div>
                   <div className="flex items-center gap-2">
                     <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.question_text}</p>
                     <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300">
                       {item.type}
                     </span>
                   </div>
                   <p className="text-xs text-slate-500 mt-0.5">
                     {item.parameters.length} Evaluation Parameters
                   </p>
                </div>
              </div>
              {expandedId === item.question_no ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </div>

            {expandedId === item.question_no && (
              <div className="p-4 border-t border-slate-200 bg-white space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ideal Answer</h4>
                  <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 font-mono whitespace-pre-wrap border border-slate-100">
                    {item.ideal_answer}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Evaluation Parameters</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.parameters.map((param, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-blue-50 border border-blue-100 rounded text-sm">
                        <span className="text-blue-800 font-medium">{param.name}</span>
                        <span className="text-blue-600 font-bold">{param.weightage} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};