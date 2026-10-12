import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const RUN = "X-Lovable-AIG-Run-ID";
const MODEL = "openai/gpt-6-astra";

type Note = { title?: string; unit?: string; subjectName?: string; content?: string };
type Body = {
  task: "answer" | "curriculum" | "scan" | "extract";
  file?: { name: string; mime: string; data: string };
  question?: string;
  mode?: string;
  notes?: Note[];
  subject?: string;
  profile?: { college?: string; branch?: string; year?: string; semester?: string };
  history?: { question: string; answer: string }[];
  image?: string;
};

const MODE_RULES: Record<string, string> = {
  "3 Marks":
    "~80-120 words. A one-line definition, then exactly 3 crisp bullet points (each a scoring point). Include the key formula if one exists.",
  "5 Marks":
    "~200-280 words. Definition, 4-5 explained points, a short example or diagram description, one-line conclusion.",
  "10 Marks":
    "~500-700 words. Sections: Introduction, Core Concept / Working, Key Components or Steps (numbered), Diagram (describe it or draw a small ASCII/markdown table), Example (code or numerical if relevant), Advantages / Limitations, Conclusion.",
  "Viva Answer": "2-4 confident spoken-style sentences using the exact technical terms an examiner expects. No headings.",
  "Quick Revision":
    "A dense cheat-sheet: key definitions, formulas, mnemonics, and 'common exam traps'. Bullets only, no prose.",
  "Detailed Explanation":
    "Teach it from intuition up: a real-world analogy first, then the formal idea, a worked example, and common misconceptions. End with 3 practice questions.",
};

// Simple keyword relevance so only the most useful notes reach the model.
function pickNotes(notes: Note[], query: string, limitChars = 14000) {
  const terms = query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  const scored = notes
    .map((n) => {
      const hay = `${n.title ?? ""} ${n.title ?? ""} ${n.content ?? ""}`.toLowerCase();
      const score = terms.reduce((s, t) => s + (hay.split(t).length - 1), 0);
      return { n, score };
    })
    .sort((a, b) => b.score - a.score);
  const out: string[] = [];
  let used = 0;
  for (const { n, score } of scored) {
    if (terms.length && score === 0 && out.length >= 2) break;
    const block = `### NOTE: ${n.title || "Untitled"} (Unit ${n.unit || "?"}${n.subjectName ? `, ${n.subjectName}` : ""})\n${(n.content ?? "").slice(0, 5000)}`;
    if (used + block.length > limitChars) break;
    out.push(block);
    used += block.length;
  }
  return out;
}

function build(body: Body): { instructions: string; messages: ModelMessage[] } {
  const p = body.profile ?? {};
  const who = [p.college, p.branch, p.year, p.semester].filter(Boolean).join(", ");

  if (body.task === "scan") {
    return {
      instructions:
        "You read photos of exam papers, textbook pages and handwritten notes. Transcribe the question(s) shown exactly, fixing obvious OCR errors. If it's notes rather than a question, write one clear question that asks to explain the main concept shown. Output ONLY the question text, nothing else.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the question from this image." },
            { type: "image", image: new URL(body.image ?? "") },
          ],
        },
      ],
    };
  }

  if (body.task === "extract") {
    const f = body.file!;
    const part =
      f.mime === "application/pdf"
        ? ({ type: "file", filename: f.name, data: f.data, mediaType: "application/pdf" } as const)
        : ({ type: "image", image: new URL(`data:${f.mime};base64,${f.data}`) } as const);
    return {
      instructions:
        "You convert study material (PDFs, slides, scanned or handwritten notes, photos of textbooks) into clean markdown study notes. Transcribe ALL the text faithfully in reading order, keep headings, lists, tables, formulas (LaTeX $...$) and code. Briefly describe diagrams in [Diagram: ...]. Do not summarise or skip content. Output only the notes.",
      messages: [{ role: "user", content: [{ type: "text", text: `Extract the notes from "${f.name}".` }, part] }],
    };
  }

  if (body.task === "curriculum") {
    const notes = (body.notes ?? [])
      .map((n) => `### ${n.title || "Untitled"} (Unit ${n.unit || "?"})\n${(n.content ?? "").slice(0, 2500)}`)
      .join("\n\n")
      .slice(0, 30000);
    return {
      instructions: `You are an academic syllabus builder for ${body.subject || "a university subject"}${who ? ` (${who})` : ""}.
Build a clean syllabus strictly from the student's notes. Group by unit ("### Unit N: <inferred unit title>"), order units numerically.
Under each unit list topics as "- **Topic**" with 1-3 nested sub-topics actually covered in the notes, and mark the most exam-important topics with ⭐.
Never invent topics absent from the notes. End with "### Exam Focus" listing the 5 highest-yield topics.`,
      messages: [{ role: "user", content: `Student notes:\n\n${notes}` }],
    };
  }

  const q = body.question ?? "";
  const notes = pickNotes(body.notes ?? [], q);
  const mode = body.mode && MODE_RULES[body.mode] ? body.mode : "5 Marks";
  const instructions = `You are StudentOS AI Tutor — an expert university examiner and teacher${who ? ` helping a student at ${who}` : ""}${body.subject ? `, subject: ${body.subject}` : ""}.
Write answers that would score full marks in an Indian university exam.

Answer format — "${mode}": ${MODE_RULES[mode]}

Rules:
- Answer the actual question directly and correctly; no filler, no "great question", no generic placeholders.
- Use markdown: ### headings, bullets, **bold key terms**, tables for comparisons, fenced code blocks for code, and LaTeX math with $...$ / $$...$$.
- If the question is ambiguous, pick the most likely exam interpretation and state it in one line.
${
  notes.length
    ? `- The student's own notes are below. Prefer their terminology, definitions and examples. If the notes are incomplete or wrong, use your expert knowledge and briefly flag the correction. Do not mention "the notes" more than once.

STUDENT NOTES:
${notes.join("\n\n")}`
    : "- No notes were provided; answer from standard textbook knowledge."
}`;

  const messages: ModelMessage[] = [];
  for (const h of (body.history ?? []).slice(-3)) {
    messages.push({ role: "user", content: h.question }, { role: "assistant", content: h.answer.slice(0, 3000) });
  }
  messages.push({ role: "user", content: q });
  return { instructions, messages };
}

function friendly(err: unknown) {
  const e = err as { statusCode?: number; message?: string };
  if (e?.statusCode === 429) return "The AI is busy right now. Please wait a moment and try again.";
  if (e?.statusCode === 402) return "AI credits have run out for this workspace. Add credits to keep using the tutor.";
  if (e?.statusCode === 403) return "AI access is currently blocked for this workspace.";
  return e?.message || "The AI couldn't answer right now.";
}

export async function handleAI(request: Request) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return new Response("AI is not configured.", { status: 500 });
  const body = (await request.json()) as Body;

  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN) ?? undefined;
      return res;
    },
  });

  const { instructions, messages } = build(body);
  const result = streamText({
    model: provider.responses(MODEL),
    system: instructions,
    messages,
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: body.task === "scan" ? "low" : "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") controller.enqueue(enc.encode(part.text));
          else if (part.type === "error") controller.enqueue(enc.encode(`\u0000ERR:${friendly(part.error)}`));
        }
      } catch (err) {
        if (!request.signal.aborted) controller.enqueue(enc.encode(`\u0000ERR:${friendly(err)}`));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
