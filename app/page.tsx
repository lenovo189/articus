// app/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./page.css";

interface Mistake {
  error: string;
  type: "grammar" | "vocabulary" | "fluency";
  explanation: string;
  correction: string;
  severity: "minor" | "moderate" | "major";
}

interface BandScore {
  band: number;
  evidence: string;
  missing_for_next_band: string;
  reasoning: string;
}

interface ScoreResult {
  transcription: string;
  mistake_audit: {
    grammar_errors: Mistake[];
    vocabulary_errors: Mistake[];
    fluency_markers: Mistake[];
    error_counts: {
      grammar: number;
      vocabulary: number;
      fluency: number;
      total: number;
    };
  };
  band_breakdown: {
    fluency_coherence: BandScore;
    lexical_resource: BandScore;
    grammatical_range_accuracy: BandScore;
    pronunciation: BandScore & { caveat?: string };
  };
  overall_band: number;
  band_calculation: string;
  calibration_note: string;
  strengths: string[];
  improvements: string[];
  corrected_speech: string;
}

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScoreResult | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        await sendAudio(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);

      // Timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => {
        track.stop();
      });
    }
  };

  const sendAudio = async (audioBlob: Blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      formData.append("user_id", "user_" + Date.now());

      const response = await fetch("/api/analyze-speech", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error analyzing speech");
        setLoading(false);
        return;
      }

      setResults({
        ...data.scores,
        transcription: data.transcription,
      });
    } catch (err) {
      console.error("Error:", err);
      setError("Error analyzing speech. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container">
      <div className="header">
        <h1>IELTS Speaking Practice</h1>
        <p className="subtitle">Master your English speaking skills</p>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="error-box">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="error-close"
          >
            ✕
          </button>
        </div>
      )}

      {/* RECORDING SECTION */}
      {!results && (
        <div className="recording-section">
          <div className="task-box">
            <p className="task-label">Speaking Task</p>
            <p className="task-text">
              Describe a hobby you enjoy and explain why you like it.
            </p>
          </div>

          {recording && (
            <div className="timer">
              <div className="timer-display">{formatTime(recordingTime)}</div>
              <div className="recording-indicator">
                <span className="dot"></span> Recording
              </div>
            </div>
          )}

          <div className="button-group">
            <button
              onClick={startRecording}
              disabled={recording || loading}
              className="btn btn-primary"
            >
              {recording ? "Recording..." : "Start Recording"}
            </button>
            <button
              onClick={stopRecording}
              disabled={!recording}
              className="btn btn-danger"
            >
              Stop & Analyze
            </button>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="loading-section">
          <div className="spinner"></div>
          <p className="loading-text">Analyzing your speech...</p>
          <p className="loading-subtext">
            This may take a few seconds
          </p>
        </div>
      )}

      {/* RESULTS SECTION */}
      {results && !loading && (
        <div className="results-section">
          {/* TRANSCRIPTION */}
          <div className="result-card transcription-card">
            <h2 className="card-title">What You Said</h2>
            <p className="transcription-text">"{results.transcription}"</p>
          </div>

          {/* ANALYSIS SUMMARY */}
          <div className="result-card analysis-card">
            <h2 className="card-title">Expert Analysis</h2>
            <div className="analysis-grid">
              <div className="analysis-item">
                <h3>Fluency & Coherence</h3>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.band_breakdown.fluency_coherence.reasoning}</ReactMarkdown>
                </div>
                <p className="evidence-text"><strong>Evidence:</strong> {results.band_breakdown.fluency_coherence.evidence}</p>
              </div>
              <div className="analysis-item">
                <h3>Lexical Resource</h3>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.band_breakdown.lexical_resource.reasoning}</ReactMarkdown>
                </div>
                <p className="evidence-text"><strong>Evidence:</strong> {results.band_breakdown.lexical_resource.evidence}</p>
              </div>
              <div className="analysis-item">
                <h3>Grammar Range & Accuracy</h3>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.band_breakdown.grammatical_range_accuracy.reasoning}</ReactMarkdown>
                </div>
                <p className="evidence-text"><strong>Evidence:</strong> {results.band_breakdown.grammatical_range_accuracy.evidence}</p>
              </div>
              <div className="analysis-item">
                <h3>Pronunciation</h3>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.band_breakdown.pronunciation.reasoning}</ReactMarkdown>
                </div>
                <p className="evidence-text"><strong>Evidence:</strong> {results.band_breakdown.pronunciation.evidence}</p>
                {results.band_breakdown.pronunciation.caveat && (
                  <p className="caveat-text small"><em>{results.band_breakdown.pronunciation.caveat}</em></p>
                )}
              </div>
            </div>
          </div>

          {/* MISTAKES */}
          {[
            ...results.mistake_audit.grammar_errors,
            ...results.mistake_audit.vocabulary_errors,
            ...results.mistake_audit.fluency_markers
          ].length > 0 && (
              <div className="result-card mistakes-card">
                <h2 className="card-title">
                  Mistakes & Improvements ({results.mistake_audit.error_counts.total})
                </h2>
                <div className="mistakes-list">
                  {[
                    ...results.mistake_audit.grammar_errors,
                    ...results.mistake_audit.vocabulary_errors,
                    ...results.mistake_audit.fluency_markers
                  ].map((mistake, idx) => (
                    <div key={idx} className="mistake-item">
                      <div className="mistake-header">
                        <div className="mistake-info">
                          <p className="error-highlight">
                            "{mistake.error}"
                          </p>
                          <div className="badge-group">
                            <span className={`type-badge type-${mistake.type}`}>
                              {mistake.type}
                            </span>
                            <span className={`severity-badge severity-${mistake.severity}`}>
                              {mistake.severity}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mistake-explanation markdown-content">
                        <strong>Issue:</strong> <ReactMarkdown remarkPlugins={[remarkGfm]}>{mistake.explanation}</ReactMarkdown>
                      </div>
                      <div className="mistake-correction markdown-content">
                        <strong>Better:</strong> <ReactMarkdown remarkPlugins={[remarkGfm]}>{mistake.correction}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* SCORES AND REASONING */}
          <div className="result-card scores-card">
            <h2 className="card-title">
              Overall Band Score:{" "}
              <span className="overall-band">
                {results.overall_band}/9
              </span>
            </h2>
            <div className="band-calculation-box">
              <div className="band-calculation markdown-content">
                <strong>Calculation:</strong> <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.band_calculation}</ReactMarkdown>
              </div>
              <div className="calibration-note markdown-content">
                <strong>Examiner Note:</strong> <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.calibration_note}</ReactMarkdown>
              </div>
            </div>

            <div className="scores-detailed-grid">
              <div className="score-detail-item">
                <div className="score-header">
                  <span className="score-label">Fluency & Coherence</span>
                  <span className="score-num">{results.band_breakdown.fluency_coherence.band}</span>
                </div>
                <div className="score-reason markdown-content">
                  <strong>Missing for next band:</strong> <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.band_breakdown.fluency_coherence.missing_for_next_band}</ReactMarkdown>
                </div>
              </div>

              <div className="score-detail-item">
                <div className="score-header">
                  <span className="score-label">Lexical Resource</span>
                  <span className="score-num">{results.band_breakdown.lexical_resource.band}</span>
                </div>
                <div className="score-reason markdown-content">
                  <strong>Missing for next band:</strong> <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.band_breakdown.lexical_resource.missing_for_next_band}</ReactMarkdown>
                </div>
              </div>

              <div className="score-detail-item">
                <div className="score-header">
                  <span className="score-label">Grammar Range & Accuracy</span>
                  <span className="score-num">{results.band_breakdown.grammatical_range_accuracy.band}</span>
                </div>
                <div className="score-reason markdown-content">
                  <strong>Missing for next band:</strong> <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.band_breakdown.grammatical_range_accuracy.missing_for_next_band}</ReactMarkdown>
                </div>
              </div>

              <div className="score-detail-item">
                <div className="score-header">
                  <span className="score-label">Pronunciation</span>
                  <span className="score-num">{results.band_breakdown.pronunciation.band}</span>
                </div>
                <div className="score-reason markdown-content">
                  <strong>Missing for next band:</strong> <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.band_breakdown.pronunciation.missing_for_next_band}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>

          {/* CORRECTED SPEECH */}
          {results.corrected_speech && (
            <div className="result-card corrected-card">
              <h2 className="card-title">
                How to Say It Better (Band 7-8)
              </h2>
              <div className="corrected-speech markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.corrected_speech}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* FEEDBACK */}
          <div className="result-card feedback-card">
            <h2 className="card-title">Key takeaways</h2>
            {results.strengths && results.strengths.length > 0 && (
              <div className="feedback-section strengths-section">
                <h3>Strengths</h3>
                <ul>
                  {results.strengths.map((strength, idx) => (
                    <li key={idx}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{strength}</ReactMarkdown>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {results.improvements && results.improvements.length > 0 && (
              <div className="feedback-section improvements-section">
                <h3>Areas to Improve</h3>
                <ul>
                  {results.improvements.map((improvement, idx) => (
                    <li key={idx}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{improvement}</ReactMarkdown>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="action-buttons">
            <button
              onClick={() => setResults(null)}
              className="btn btn-primary btn-large"
            >
              Try Another Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}