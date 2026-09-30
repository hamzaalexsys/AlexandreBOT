export const TRANSCRIPTION_MODEL = "openai/gpt-4o-transcribe";
export const SPEECH_MODEL = "x-ai/grok-voice-tts-1.0";
export const SPEECH_VOICE = "sal";

export function transcriptionOptions(language: "fr" | "ar", context: string, vocabulary = "") {
  const names = "Fahd, Hamza, Aamar, Amine, Youssef, Yassine, Mohamed, Mohammed, Mehdi, Ayoub, Imane, Salma, Fatima, Khadija, Hajar, Maryam, Zineb, فهد، حمزة، يوسف، ياسين، أمين، محمد";
  const prompt = language === "ar"
    ? `محادثة مدرسية في المغرب بالعربية أو الدارجة، وأحياناً بالفرنسية. أسماء محتملة: ${names}. ${vocabulary}`
    : `Conversation scolaire au Maroc, en français, parfois en darija. Orthographe de prénoms possibles : ${names}. Groupe scolaire Alexandre, Milo. ${vocabulary}`;
  const hint = `${prompt}\n${context ? `Contexte précédent (ne pas répéter) : ${context}` : ""}`.slice(0, 1600);
  return { options: { openai: { prompt: hint }, groq: { prompt: hint } } };
}

export function speechText(text: string) {
  return text.replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*_`#~]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    // Strip synthesis control tags from user/model content, keeping ordinary text.
    .replace(/<[^>]*>|\[(?:pause|laugh|sigh|whisper|breath)[^\]]*\]/gi, "")
    .replace(/\bFAHD\b/g, "Fahd")
    .replace(/\bHAMZA\b/g, "Hamza")
    .replace(/\s+/g, " ").trim();
}
