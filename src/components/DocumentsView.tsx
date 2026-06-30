import React, { useState, useEffect } from 'react';
import { UserDocument, LanguageCode } from '../types';
import { dbClient } from '../lib/supabaseClient';
import { mockOcrDocument } from '../lib/aiService';
import { 
  FileText, UploadCloud, CheckCircle, Clock, AlertCircle, Sparkles, 
  Trash2, FileCheck, BrainCircuit, RefreshCw, Layers 
} from 'lucide-react';

interface DocumentsViewProps {
  currentLanguage: LanguageCode;
  onProfileUpdated: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ currentLanguage, onProfileUpdated }) => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [selectedDocType, setSelectedDocType] = useState('aadhaar');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrOutput, setOcrOutput] = useState<any>(null);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    const docs = await dbClient.getDocuments();
    setDocuments(docs);
  };

  const handleSampleTrigger = async () => {
    setIsScanning(true);
    setOcrOutput(null);

    // Get current citizen profile name
    const profile = await dbClient.getProfile();
    const currentName = profile?.name || "";

    // Dynamic mock file name
    const docLabels: Record<string, string> = {
      aadhaar: currentName ? `Aadhaar_Card_${currentName.replace(/\s+/g, '_')}.pdf` : 'Aadhaar_Card_Verified.pdf',
      ration_card: currentName ? `Ration_Card_${currentName.replace(/\s+/g, '_')}.png` : 'Ration_Card_Verified.png',
      income_cert: 'Income_Certificate_2026.pdf',
      disability_cert: 'UDID_Disability_MH.png',
      bank_passbook: currentName ? `SBI_Passbook_${currentName.replace(/\s+/g, '_')}.pdf` : 'SBI_Passbook_Verified.pdf'
    };
    const fileName = docLabels[selectedDocType] || 'Govt_Certificate_Ver.pdf';
    setSelectedFileName(fileName);

    try {
      // Calls server-side Express OCR simulation!
      const ocrResult = await mockOcrDocument(fileName, currentName);
      
      // Simulate real visual loader delay for scanning
      setTimeout(async () => {
        setOcrOutput(ocrResult);
        setIsScanning(false);

        // Update document status in full-stack backend db
        const matchingDoc = documents.find(d => d.type === selectedDocType);
        if (matchingDoc) {
          await dbClient.updateDocumentStatus(matchingDoc.id, 'verified');
        } else {
          await dbClient.saveDocument({
            name: ocrResult.documentType,
            type: selectedDocType,
            status: 'verified',
            ocrText: JSON.stringify(ocrResult.extractedDetails),
            ocrConfidence: ocrResult.confidence
          });
        }

        // Also update the citizen's existingDocuments list on profile!
        const profile = await dbClient.getProfile();
        if (profile) {
          const updatedDocs = Array.from(new Set([...profile.existingDocuments, selectedDocType]));
          const docRatio = updatedDocs.length / 8;
          const computedReadiness = Math.round(50 + docRatio * 50);

          await dbClient.saveProfile({
            ...profile,
            existingDocuments: updatedDocs,
            readinessScore: computedReadiness
          });
        }

        loadDocs();
        onProfileUpdated();
        alert(`🎉 Simulated OCR successfully verified your document!\n\nExtracted: ${ocrResult.documentType}\nConfidence: ${ocrResult.confidence}%\nYour overall Application Readiness score has been dynamically boosted!`);
      }, 3000);

    } catch (e) {
      console.error(e);
      setIsScanning(false);
    }
  };

  const docTypes = [
    { type: 'aadhaar', label: 'Aadhaar Card' },
    { type: 'ration_card', label: 'Ration Card' },
    { type: 'voter_id', label: 'Voter ID' },
    { type: 'pan_card', label: 'PAN Card' },
    { type: 'income_cert', label: 'Income Certificate' },
    { type: 'caste_cert', label: 'Caste Certificate' },
    { type: 'bank_passbook', label: 'Bank Passbook' },
    { type: 'disability_cert', label: 'Disability Certificate' }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8" id="documents-view">
      
      {/* Page Header */}
      <div className="border-b border-gray-100 pb-4 mb-8">
        <h2 className="font-sans text-2xl font-extrabold text-gray-900 tracking-tight">
          Documents Vault & AI OCR Verification
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Upload and verify your certificates to qualify for welfare. Try uploading simulated documents to trigger on-the-spot AI parsing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Upload Simulator and Scanned Result */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main drag-and-drop panel */}
          <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-xs">
            <h3 className="font-sans text-base font-bold text-gray-900 mb-4">Upload Government Document</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select Document Category</label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                >
                  {docTypes.map(d => (
                    <option key={d.type} value={d.type}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">
                  Click 'Select Sample Slip' to generate a simulated government certificate matches your profile name for verification testing.
                </p>
                <button
                  onClick={handleSampleTrigger}
                  disabled={isScanning}
                  className="w-full py-2.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 transition-colors flex items-center justify-center space-x-1"
                >
                  <Sparkles className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>Select Sample Government Slip</span>
                </button>
              </div>
            </div>

            {/* Simulated file upload area */}
            <div className="border-2 border-dashed border-teal-100 bg-teal-50/10 rounded-2xl p-8 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[180px]">
              {isScanning ? (
                <div className="flex flex-col items-center space-y-3 animate-pulse">
                  <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                  <span className="text-xs font-bold text-teal-900 uppercase tracking-wide">AI OCR: Reading document metadata...</span>
                  <p className="text-[10px] text-gray-400 max-w-xs">{selectedFileName}</p>
                  <div className="w-48 bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-teal-600 h-full rounded-full animate-infinite-loading" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-10 w-10 text-teal-600 mb-3" />
                  <span className="text-xs font-extrabold text-gray-700">Drag & drop your physical card here</span>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                    Supports high-resolution camera photos, PNG, JPG, or PDF (DigiLocker validated). Max size 5MB.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Scanned metadata details */}
          {ocrOutput && (
            <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-teal-950 text-white rounded-3xl p-6 shadow-md border border-teal-800">
              <div className="flex items-center justify-between border-b border-teal-800 pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <BrainCircuit className="h-5 w-5 text-teal-300 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-200">Gemini OCR Parser Result</span>
                </div>
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/50 border border-emerald-900/50 px-2.5 py-1 rounded-md">
                  Confidence: {ocrOutput.confidence}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-teal-300 font-bold uppercase tracking-wide">Document Extracted</span>
                  <span className="text-sm font-bold mt-1 block">{ocrOutput.documentType}</span>
                </div>

                <div>
                  <span className="block text-[10px] text-teal-300 font-bold uppercase tracking-wide">Name Extracted</span>
                  <span className="text-sm font-bold mt-1 block">{ocrOutput.extractedName || 'N/A'}</span>
                </div>
              </div>

              {ocrOutput.extractedDetails && (
                <div className="mt-6 border-t border-teal-800 pt-4 space-y-2.5">
                  <span className="block text-[10px] text-teal-300 font-bold uppercase tracking-wide mb-2">Parsed Key-Value Pairs</span>
                  {Object.entries(ocrOutput.extractedDetails).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs font-medium border-b border-teal-800/30 pb-1.5">
                      <span className="text-teal-200">{key}</span>
                      <span className="text-teal-50 font-bold">{value as string}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Wallet Inventory */}
        <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center space-x-2 mb-4">
            <Layers className="h-5 w-5 text-teal-700" />
            <h3 className="font-sans text-base font-bold text-gray-900">Your Document Wallet</h3>
          </div>

          <div className="space-y-2">
            {documents.map((doc) => {
              const isVerified = doc.status === 'verified';
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 border border-gray-100"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-extrabold text-gray-700 truncate">{doc.name}</span>
                      <span className="block text-[9px] text-gray-400 capitalize">{doc.type.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold uppercase shrink-0 px-2 py-1 rounded-md border ${
                    isVerified 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
export default DocumentsView;
