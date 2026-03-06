'use client';

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion } from 'motion/react';
import { FileText, Briefcase, Sparkles, CheckCircle2, AlertCircle, ChevronRight, Download, Upload, FileUp } from 'lucide-react';
import Markdown from 'react-markdown';

export default function Home() {
  const [jobDescription, setJobDescription] = useState('');
  const [currentResume, setCurrentResume] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploadingJob, setIsUploadingJob] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  
  const jobFileInputRef = useRef<HTMLInputElement>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  const [result, setResult] = useState<{
    atsKeywords: string[];
    matchingScore: number;
    feedback: string;
    optimizedResume: string;
  } | null>(null);
  const [error, setError] = useState('');

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      // Dynamically import pdfjs-dist only on the client side
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText;
    } catch (err) {
      console.error('PDF extraction error:', err);
      throw new Error('PDFファイルの読み込みに失敗しました。');
    }
  };

  const extractTextFromTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('ファイルの読み込みに失敗しました。'));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    target: 'job' | 'resume'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = target === 'job' ? setIsUploadingJob : setIsUploadingResume;
    const setContent = target === 'job' ? setJobDescription : setCurrentResume;
    
    setUploading(true);
    setError('');

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.md')) {
        text = await extractTextFromTextFile(file);
      } else {
        throw new Error('対応していないファイル形式です。PDFまたはテキストファイル(.txt, .md)をアップロードしてください。');
      }

      setContent(text);
    } catch (err: any) {
      setError(err.message || 'ファイルの読み込み中にエラーが発生しました。');
    } finally {
      setUploading(false);
      // Reset input so the same file can be selected again
      if (e.target) e.target.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim() || !currentResume.trim()) {
      setError('求人票と現在の職務経歴書の両方を入力してください。');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini APIキーが設定されていません。');
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
あなたは日本の転職市場に精通したプロのキャリアコンサルタント兼ATS（採用管理システム）最適化の専門家です。
以下の求人票と現在の職務経歴書を比較・分析し、ATSを通過しやすく、かつ採用担当者に響くように職務経歴書を最適化してください。

【求人票】
${jobDescription}

【現在の職務経歴書】
${currentResume}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: 'あなたは日本の転職市場に精通したプロのキャリアコンサルタント兼ATS最適化の専門家です。',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              atsKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '求人票から抽出された重要なATSキーワード（スキル、経験、資格など）',
              },
              matchingScore: {
                type: Type.NUMBER,
                description: '現在の職務経歴書と求人票のマッチ度（0〜100のスコア）',
              },
              feedback: {
                type: Type.STRING,
                description: '全体的なフィードバックと、なぜそのように最適化したかの解説（マークダウン形式）',
              },
              optimizedResume: {
                type: Type.STRING,
                description: '最適化された職務経歴書のテキスト。求人票のキーワードを自然に盛り込み、成果を定量的にアピールする構成にすること（マークダウン形式）',
              },
            },
            required: ['atsKeywords', 'matchingScore', 'feedback', 'optimizedResume'],
          },
        },
      });

      const jsonStr = response.text?.trim();
      if (!jsonStr) {
        throw new Error('AIからの応答が空でした。');
      }

      const parsedResult = JSON.parse(jsonStr);
      setResult(parsedResult);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '分析中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">AI Resume Optimizer</h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            ATS対応・職務経歴書最適化
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Input Section */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* Job Description Input */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500" />
                <h2 className="font-medium text-slate-700">求人票 (Job Description)</h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  ref={jobFileInputRef}
                  onChange={(e) => handleFileUpload(e, 'job')}
                />
                <button
                  onClick={() => jobFileInputRef.current?.click()}
                  disabled={isUploadingJob}
                  className="text-xs flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-medium bg-white border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingJob ? (
                    <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <FileUp className="w-3.5 h-3.5" />
                  )}
                  ファイル読込
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 w-full p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm leading-relaxed"
              placeholder="応募したい求人の業務内容、必須要件、歓迎要件などをここに貼り付けるか、PDF・テキストファイルを読み込んでください..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          {/* Current Resume Input */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h2 className="font-medium text-slate-700">現在の職務経歴書 (Current Resume)</h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  ref={resumeFileInputRef}
                  onChange={(e) => handleFileUpload(e, 'resume')}
                />
                <button
                  onClick={() => resumeFileInputRef.current?.click()}
                  disabled={isUploadingResume}
                  className="text-xs flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-medium bg-white border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingResume ? (
                    <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <FileUp className="w-3.5 h-3.5" />
                  )}
                  ファイル読込
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 w-full p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm leading-relaxed"
              placeholder="現在の職務経歴書をここに貼り付けるか、PDF・テキストファイルを読み込んでください..."
              value={currentResume}
              onChange={(e) => setCurrentResume(e.target.value)}
            />
          </div>
        </section>

        {/* Action Button */}
        <div className="flex flex-col items-center justify-center py-4">
          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm w-full max-w-md border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {isAnalyzing ? (
              <>
                <svg className="w-5 h-5 animate-spin text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>AIが分析・最適化中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>ATS最適化を実行する</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-20"
          >
            {/* Score & Keywords */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Score Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
                <h3 className="text-sm font-medium text-slate-500 mb-4 uppercase tracking-wider">マッチ度スコア</h3>
                <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-slate-100"
                    />
                    <motion.circle
                      initial={{ strokeDasharray: "0 1000" }}
                      animate={{ strokeDasharray: `${(result.matchingScore / 100) * 351.85} 1000` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className={
                        result.matchingScore >= 80 ? "text-emerald-500" :
                        result.matchingScore >= 60 ? "text-amber-500" : "text-red-500"
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-4xl font-light tracking-tighter text-slate-800">{result.matchingScore}</span>
                    <span className="text-xs text-slate-400 font-medium">/ 100</span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  {result.matchingScore >= 80 ? '高い確率で書類選考を通過する可能性があります。' :
                   result.matchingScore >= 60 ? 'いくつかの改善で通過率を高められます。' : '大幅な見直しが必要です。'}
                </p>
              </div>

              {/* Keywords Card */}
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-medium text-slate-800">抽出されたATSキーワード</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  求人票から抽出された、採用担当者やATSが重視するキーワードです。最適化された職務経歴書にはこれらが自然に組み込まれています。
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.atsKeywords.map((keyword, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-100">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Feedback & Optimized Resume */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Feedback */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-medium text-slate-800">プロからのフィードバック</h3>
                </div>
                <div className="p-6 prose prose-slate prose-sm max-w-none overflow-y-auto max-h-[600px]">
                  <div className="markdown-body">
                    <Markdown>{result.feedback}</Markdown>
                  </div>
                </div>
              </div>

              {/* Optimized Resume */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-medium text-slate-800">最適化された職務経歴書</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.optimizedResume);
                      alert('クリップボードにコピーしました！');
                    }}
                    className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    コピーする
                  </button>
                </div>
                <div className="p-6 prose prose-slate prose-sm max-w-none overflow-y-auto max-h-[600px] bg-[#fafafa]">
                  <div className="markdown-body">
                    <Markdown>{result.optimizedResume}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
