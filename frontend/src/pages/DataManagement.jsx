import React, { useState } from 'react';
import { Database, Upload, FileText, CheckCircle2, AlertTriangle, Download, Server, Cpu, Radio, RotateCcw, ArrowDownCircle } from 'lucide-react';
import { api } from '../services/api';

export default function DataManagement({ onResetFleet }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadCSV(file);
      setUploadResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Air temperature [K],Process temperature [K],Rotational speed [rpm],Torque [Nm],Tool wear [min],Type\n" +
      "298.1,308.6,1551,42.8,0,M\n" +
      "298.2,308.7,1408,46.3,3,L\n" +
      "298.4,309.0,1498,49.4,5,H\n" +
      "300.2,310.4,1520,38.2,12,M\n" +
      "302.1,311.8,1380,55.4,195,L\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "maintai_telemetry_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetDatabase = async () => {
    try {
      setResetting(true);
      await onResetFleet();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 5000);
    } catch (err) {
      setError(`Database reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center space-x-2">
            <Database className="w-6 h-6 text-cyan-400" />
            <span>Industrial Data Ingestion & Dataset Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">Multi-source schema validation, CSV telemetry batch ingestion, and database telemetry re-seeding.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadSampleCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#141D30] hover:bg-[#1E2B45] text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </button>

          <button
            onClick={handleResetDatabase}
            disabled={resetting}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#141D30] hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting Fleet Database...' : 'Reset & Re-seed Database'}</span>
          </button>
        </div>
      </div>

      {resetSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Fleet telemetry, maintenance memory, and time-series degradation histories have been reseeded to nominal baseline.</span>
        </div>
      )}

      {/* 3 Supported Industrial Datasets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="industrial-panel p-4 border-l-4 border-l-cyan-400">
          <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase">
            <Server className="w-4 h-4" />
            <span>AI4I 2020 Predictive Fleet</span>
          </div>
          <div className="text-sm font-bold text-white mt-1">10,000 Industrial Milling Records</div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Standard predictive maintenance dataset with 5 physical failure modes (TWF, HDF, PWF, OSF, RNF).
          </p>
          <div className="mt-3 text-[11px] font-mono text-emerald-400 font-semibold">Status: Active & Loaded</div>
        </div>

        <div className="industrial-panel p-4 border-l-4 border-l-indigo-400">
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase">
            <Cpu className="w-4 h-4" />
            <span>Vibration & Acoustic Telemetry</span>
          </div>
          <div className="text-sm font-bold text-white mt-1">1,800+ Sensor Waveform Series</div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            High-frequency acoustic emission, tri-axial vibration RMS, and empirical mode decomposition.
          </p>
          <div className="mt-3 text-[11px] font-mono text-indigo-300 font-semibold">Status: Ready in /data</div>
        </div>

        <div className="industrial-panel p-4 border-l-4 border-l-amber-400">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase">
            <Radio className="w-4 h-4" />
            <span>Physics-Informed Wear-Life Modeling</span>
          </div>
          <div className="text-sm font-bold text-white mt-1">Tool-Wear & Stress Degradation</div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Physics-informed tool-wear and operating-stress degradation modeling for time-to-inspection estimation.
          </p>
          <div className="mt-3 text-[11px] font-mono text-amber-300 font-semibold">Status: Model Trained</div>
        </div>
      </div>

      {/* CSV Telemetry Batch Upload */}
      <div className="industrial-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Upload Custom Sensor Telemetry CSV</span>
          </h2>
          <button
            onClick={handleDownloadSampleCSV}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Download Valid Template (.csv)</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Upload custom factory sensor readings. The platform validates incoming schemas and feeds records into the XGBoost inference pipeline.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-[#223048] hover:border-cyan-500 rounded-xl p-6 text-center cursor-pointer bg-[#080C16] transition">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer block">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              {file ? (
                <div className="text-sm font-mono text-cyan-300 font-bold">{file.name} ({(file.size / 1024).toFixed(1)} KB)</div>
              ) : (
                <>
                  <div className="text-sm font-semibold text-slate-200">Click to browse or drag & drop telemetry CSV</div>
                  <div className="text-xs text-slate-400 mt-1">Supported headers: air_temperature, process_temperature, rotational_speed, torque, tool_wear</div>
                </>
              )}
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-glow-cyan disabled:opacity-50 flex items-center space-x-2"
            >
              <span>{uploading ? 'Validating Schema...' : 'Upload & Ingest Telemetry'}</span>
            </button>
          </div>
        </form>

        {/* Validation Result Box */}
        {uploadResult && (
          <div className="mt-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>Dataset Validated & Ingested Successfully</span>
            </div>
            <div className="font-mono text-[11px] text-slate-300 space-y-1">
              <div>• Matched Schema: <span className="font-bold text-cyan-300">{uploadResult.matched_schema}</span></div>
              <div>• Total Records Processed: <span className="font-bold text-white">{uploadResult.rows_processed}</span></div>
              <div>• Valid Records Count: <span className="font-bold text-emerald-300">{uploadResult.valid_rows_count}</span></div>
              <div>• Missing Values Detected: <span className="font-bold text-slate-300">{uploadResult.missing_values_detected}</span></div>
              <div>• Duplicate Rows: <span className="font-bold text-slate-300">{uploadResult.duplicate_rows_detected}</span></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Upload Failed: {error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
