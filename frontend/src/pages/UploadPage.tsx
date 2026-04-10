import { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, SkipForward } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadCSV } from '../api/upload';
import type { UploadResponse } from '../types';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const f = files[0];
    if (!f.name.endsWith('.csv')) {
      toast.error('Only CSV files are supported');
      return;
    }
    setFile(f);
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadCSV(file);
      setResult(res);
      toast.success(`Upload complete — ${res.summary.success} rows imported`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Subnet File</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload a CSV file containing subnet and IP data. Max file size: 5 MB.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-gray-700">
        <p className="font-medium text-blue-800 mb-2">Expected CSV format:</p>
        <code className="block text-xs bg-white border border-blue-100 rounded p-2 font-mono whitespace-pre">
          {`SubnetName,SubnetAddress,IpAddress
Office LAN,192.168.1.0/24,192.168.1.10
Office LAN,192.168.1.0/24,192.168.1.11
DMZ,10.0.0.0/28,`}
        </code>
        <p className="mt-2 text-xs text-gray-500">
          IpAddress is optional — rows without it will just create/update the subnet.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <UploadCloud className="mx-auto text-gray-400 mb-3" size={36} />
        {file ? (
          <div>
            <p className="font-medium text-gray-800 flex items-center justify-center gap-2">
              <FileText size={16} />
              {file.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-600">Drag and drop a CSV file here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">CSV files up to 5 MB</p>
          </>
        )}
      </div>

      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
        >
          {uploading ? 'Processing…' : 'Upload & Import'}
        </button>
      )}

      {result && (
        <div className="mt-6">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{result.summary.total}</p>
              <p className="text-xs text-gray-500">Total Rows</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{result.summary.success}</p>
              <p className="text-xs text-green-600">Imported</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-700">{result.summary.skipped}</p>
              <p className="text-xs text-yellow-600">Skipped</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{result.summary.errors}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>

          {result.results.length > 0 && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 text-sm font-medium text-gray-700">
                Row Details
              </div>
              <div className="divide-y max-h-64 overflow-y-auto">
                {result.results.map((r) => (
                  <div key={r.row} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                    {r.status === 'success' && <CheckCircle size={15} className="text-green-500 shrink-0" />}
                    {r.status === 'skipped' && <SkipForward size={15} className="text-yellow-500 shrink-0" />}
                    {r.status === 'error' && <AlertCircle size={15} className="text-red-500 shrink-0" />}
                    <span className="text-gray-500 w-14 shrink-0">Row {r.row}</span>
                    <span className={
                      r.status === 'error' ? 'text-red-700' :
                      r.status === 'skipped' ? 'text-yellow-700' : 'text-gray-700'
                    }>
                      {r.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
