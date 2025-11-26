import React, { ChangeEvent } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploadProps {
  files: File[];
  setFiles: (files: File[]) => void;
  label?: string;
  description?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  files, 
  setFiles, 
  label = "Click to upload files", 
  description = "Supported: PDF, JPG, PNG" 
}) => {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  return (
    <div className="w-full space-y-4">
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
        <input
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/jpg"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="bg-blue-100 p-3 rounded-full mb-3">
          <Upload className="w-6 h-6 text-blue-600" />
        </div>
        <p className="text-sm font-medium text-slate-700 text-center">
          {label}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {description}
        </p>
      </div>

      {files.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Selected Files ({files.length})
          </div>
          <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {files.map((file, index) => (
              <li key={index} className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center overflow-hidden">
                  <FileText className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                  <span className="text-sm text-slate-700 truncate max-w-[200px] md:max-w-xs">
                    {file.name}
                  </span>
                  <span className="ml-2 text-xs text-slate-400 flex-shrink-0">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};