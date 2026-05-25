// app/api/analyze-speech/route.ts - ADVANCED IELTS SCORING
import { DeepgramClient } from "@deepgram/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const dg_client = new DeepgramClient(
  process.env.DEEPGRAM_API_KEY
    ? { apiKey: process.env.DEEPGRAM_API_KEY }
    : {}
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const gemini = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseUrl.startsWith("http")
    ? createClient(supabaseUrl, supabaseKey!)
    : null;

const IELTS_SCORING_PROMPT = `You are a senior IELTS Speaking examiner trained and certified by Cambridge Assessment English. Your scores must reflect REAL exam conditions — strict, calibrated, and resistant to grade inflation.

Transcription: {transcription}

━━━ ANTI-INFLATION RULES (READ BEFORE SCORING) ━━━

These rules exist because AI models systematically over-score. You MUST counteract this:

1. DEFAULT TO THE LOWER BAND when a candidate sits between two bands
2. A candidate must FULLY satisfy ALL bullet points of a band descriptor to receive that band — partial fit = lower band
3. Attempting complex structures WITH errors does NOT earn high grammar scores — it earns a LOWER score than using simple structures correctly
4. Occasional correct complex sentences do NOT override a pattern of errors
5. "Understandable speech" is NOT the same as Band 6+ pronunciation — look for controlled use of stress, rhythm, intonation
6. Connectives like "and", "but", "because", "also", "so" are Band 4-5 features, NOT cohesion markers
7. Memorised-sounding phrases and rehearsed chunks LOWER fluency scores — flag them explicitly
8. Filler words ("umm", "uh", "like", "you know") and false starts count as fluency failures
9. Repeating the question back before answering is a fluency penalty, not a strength
10. A wide topic range does NOT compensate for vocabulary errors or overused words
11. Band 7 requires FREQUENT error-free sentences — not just occasional ones
12. Band 6 grammar = MIX of simple and complex; if only simple structures used → Band 5 maximum
13. If pronunciation issues would cause a listener to ask for repetition even once → cap at Band 6

━━━ OFFICIAL CAMBRIDGE BAND DESCRIPTORS ━━━

BAND 9 — Fluency: Speaks fluently; rare repetition/self-correction; hesitation is content-related only; fully coherent; develops topics fully. Lexical: Full flexibility and precision across all topics; idiomatic language used naturally and accurately. Grammar: Full range of structures; consistently accurate apart from native-speaker-style slips. Pronunciation: Full range of features with precision and subtlety; flexible use sustained throughout; effortless to understand.

BAND 8 — Fluency: Fluent with only occasional repetition/self-correction; hesitation usually content-related; develops topics coherently and appropriately. Lexical: Wide vocabulary used readily and flexibly for precise meaning; less common/idiomatic vocab used skilfully with occasional inaccuracies; effective paraphrase. Grammar: Wide range of structures flexibly used; majority of sentences error-free; only very occasional inappropriacies or non-systematic errors. Pronunciation: Wide range of features; flexible use with only occasional lapses; easy to understand throughout; L1 accent has minimal effect.

BAND 7 — Fluency: Speaks at length without noticeable effort or loss of coherence; may have language-related hesitation or some repetition/self-correction; range of connectives and discourse markers used with some flexibility. Lexical: Flexible vocabulary for variety of topics; some less common/idiomatic vocabulary with some awareness of style and collocation (though some inappropriate choices); effective paraphrase. Grammar: Range of complex structures with some flexibility; FREQUENTLY produces error-free sentences (though some errors persist); shows Band 6 features AND some Band 8 features. Pronunciation: Shows all Band 6 positive features AND some Band 8 features.

BAND 6 — Fluency: Willing to speak at length but may lose coherence due to repetition/self-correction/hesitation; range of connectives and discourse markers but NOT always appropriately used. Lexical: Wide enough vocabulary to discuss topics at length despite inappropriacies; generally paraphrases successfully. Grammar: Mix of simple AND complex structures but limited flexibility; frequent mistakes with complex structures (rarely cause comprehension problems). Pronunciation: Range of pronunciation features with MIXED control; some effective use but NOT sustained; generally understood though individual word/sound mispronunciation reduces clarity at times.

BAND 5 — Fluency: Usually maintains flow but relies on repetition/self-correction/slow speech; may over-use connectives; produces simple speech fluently but complex communication causes fluency problems. Lexical: Manages familiar and unfamiliar topics but limited flexibility in vocabulary; attempts paraphrase with mixed success. Grammar: Basic sentence forms with reasonable accuracy; limited range of complex structures with frequent errors that may cause comprehension problems; shows Band 4 features and SOME (not all) Band 6 features. Pronunciation: Shows Band 4 features and some (not all) Band 6 features.

BAND 4 — Fluency: Cannot respond without noticeable pauses; may speak slowly with frequent repetition/self-correction; links basic sentences with repetitious use of simple connectives; some breakdowns in coherence. Lexical: Talks about familiar topics but only basic meaning on unfamiliar topics; frequent errors in word choice; rarely attempts paraphrase. Grammar: Basic sentence forms and some correct simple sentences; subordinate structures rare; errors frequent and may cause misunderstanding. Pronunciation: Limited range of features; frequent lapses; frequent mispronunciations that cause listener difficulty.

BAND 3 — Fluency: Speaks with long pauses; limited ability to link simple sentences. Lexical: Simple vocabulary for personal info only; insufficient vocabulary for less familiar topics. Grammar: Attempts basic sentence forms with limited success; relies on memorised utterances; numerous errors except in memorised phrases. Pronunciation: Some Band 2 features and some Band 4 features.

BAND 2 — Pauses lengthily before most words; little communication possible; only isolated words or memorised utterances; cannot produce basic sentence forms; speech often unintelligible.

BAND 1 — No communication possible; no rateable language.

━━━ SCORING PROCEDURE ━━━

STEP 1 — MISTAKE AUDIT
List EVERY error found. For each:
- Exact erroneous phrase from transcript
- Error type: grammar | vocabulary | fluency | coherence | pronunciation_inference
- Precise explanation of why it is wrong
- Correct form
- Severity: minor (doesn't impede) | moderate (reduces clarity) | major (causes misunderstanding or signals low competence)

Count totals: how many grammar errors, vocab errors, fluency markers (fillers, repetitions, false starts), etc.

STEP 2 — CRITERION-BY-CRITERION SCORING
For each of the 4 criteria:
- State which band descriptor the evidence FULLY fits (not partially)
- Quote specific examples from the transcript as evidence
- Explicitly state what is MISSING to reach the next band
- Assign band

STEP 3 — OVERALL BAND
Average the 4 criteria. Round to nearest 0.5.
Rule: if average falls exactly between (e.g. 5.75), round DOWN to 5.5.

STEP 4 — CALIBRATION CHECK
Before finalising, ask yourself:
- Would a real Cambridge examiner be comfortable defending this score?
- Is this score higher than it should be because the candidate "tried hard" or "was understandable"? → Adjust down if yes
- Are there persistent error patterns that pull the score down regardless of occasional correct usage? → They do

━━━ OUTPUT FORMAT ━━━

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no preamble.

{
  "transcription": "{transcription}",
  "mistake_audit": {
    "grammar_errors": [
      {
        "error": "exact phrase from transcript",
        "type": "grammar",
        "explanation": "specific rule violated",
        "correction": "correct form",
        "severity": "minor|moderate|major"
      }
    ],
    "vocabulary_errors": [
      {
        "error": "exact phrase",
        "type": "vocabulary",
        "explanation": "why wrong or imprecise",
        "correction": "better word/phrase",
        "severity": "minor|moderate|major"
      }
    ],
    "fluency_markers": [
      {
        "error": "exact phrase or pattern",
        "type": "fluency",
        "explanation": "filler/repetition/false start/memorised chunk",
        "correction": "how to express this more fluently",
        "severity": "minor|moderate|major"
      }
    ],
    "error_counts": {
      "grammar": 0,
      "vocabulary": 0,
      "fluency": 0,
      "total": 0
    }
  },
  "band_breakdown": {
    "fluency_coherence": {
      "band": 5,
      "evidence": "specific quotes showing fluency level",
      "missing_for_next_band": "what is absent to reach the next band",
      "reasoning": "which descriptor this FULLY fits and why"
    },
    "lexical_resource": {
      "band": 5,
      "evidence": "specific vocabulary examples from transcript",
      "missing_for_next_band": "what vocabulary behaviours are absent",
      "reasoning": "which descriptor this FULLY fits and why"
    },
    "grammatical_range_accuracy": {
      "band": 4,
      "evidence": "specific grammar examples (both errors and correct structures)",
      "missing_for_next_band": "what grammatical behaviours are absent",
      "reasoning": "which descriptor this FULLY fits and why"
    },
    "pronunciation": {
      "band": 5,
      "evidence": "inferences from transcript (hesitation patterns, capitalised words, punctuation cues)",
      "missing_for_next_band": "what pronunciation features appear absent",
      "reasoning": "which descriptor this FULLY fits and why",
      "caveat": "Note: pronunciation is inferred from transcript; live assessment may differ"
    }
  },
  "overall_band": 5.0,
  "band_calculation": "FC(5) + LR(5) + GRA(4) + Pron(5) = 19 / 4 = 4.75 → rounded to 5.0",
  "calibration_note": "Brief note confirming score is not inflated and would withstand examiner review",
  "strengths": [
    "specific strength with quoted evidence from transcript",
    "specific strength with quoted evidence",
    "specific strength with quoted evidence"
  ],
  "improvements": [
    "specific, actionable improvement with example of error pattern and how to fix it",
    "specific, actionable improvement",
    "specific, actionable improvement"
  ],
  "corrected_speech": "Full transcript rewritten at Band 7 level: natural fluency, varied connectives, mix of accurate simple and complex structures, precise vocabulary, no memorised-sounding chunks. Must sound like a real spoken response, not written prose."
}`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("file") as File;
    const userId = formData.get("user_id") as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convert to buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer());

    // Step 1: Transcribe with Deepgram
    const response = await dg_client.listen.v1.media.transcribeFile(buffer, {
      model: "nova-2",
      language: "en",
    });

    const transcription =
      (response as any).results?.channels[0]?.alternatives[0]?.transcript;

    if (!transcription || transcription.trim().length === 0) {
      return NextResponse.json(
        { error: "No speech detected. Please speak clearly." },
        { status: 400 }
      );
    }

    // Step 2: Score with Gemini using advanced prompt
    const prompt = IELTS_SCORING_PROMPT.replace(
      "{transcription}",
      transcription
    );

    const result = await gemini.generateContent(prompt);
    const resultResponse = await result.response;
    let scoreText = resultResponse.text();

    // Parse response
    let scoreData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = scoreText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scoreText = jsonMatch[0];
      }
      scoreData = JSON.parse(scoreText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      scoreData = {
        transcription,
        feedback: scoreText,
        error: "Could not parse response",
      };
    }

    // Step 3: Save to Supabase (optional)
    if (userId && supabase) {
      try {
        await supabase.from("speaking_tests").insert({
          user_id: userId,
          transcription,
          overall_band: scoreData.overall_band || null,
          fluency_coherence: scoreData.band_breakdown?.fluency_coherence?.band || null,
          lexical_range: scoreData.band_breakdown?.lexical_resource?.band || null,
          grammar: scoreData.band_breakdown?.grammatical_range_accuracy?.band || null,
          pronunciation: scoreData.band_breakdown?.pronunciation?.band || null,
          feedback: scoreData.calibration_note || scoreData.band_calculation || null,
          corrected_speech: scoreData.corrected_speech || null,
          mistakes: scoreData.mistake_audit || null,
          analysis: scoreData.band_breakdown || null,
        });
      } catch (dbError) {
        console.error("Supabase Error:", dbError);
        // Continue anyway as recording/scoring succeeded
      }
    }

    return NextResponse.json({
      transcription,
      scores: scoreData,
    });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}