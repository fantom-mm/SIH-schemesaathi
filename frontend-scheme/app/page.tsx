
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Languages,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  User,
} from 'lucide-react';
import axios from 'axios';

/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
|
| Do NOT hard-code localhost in production.
|
| In .env.local:
|
| NEXT_PUBLIC_SCHEME_BACKEND_URL=http://localhost:8081
|
| Then restart Next.js.
|
*/
const BACKEND_URL =
  process.env.NEXT_PUBLIC_SCHEME_BACKEND_URL?.replace(/\/$/, '') ||
  'http://localhost:8081';

/*
|--------------------------------------------------------------------------
| LANGUAGE CONFIGURATION
|--------------------------------------------------------------------------
*/

type LanguageCode =
  | 'en'
  | 'hi'
  | 'te'
  | 'ta'
  | 'kn'
  | 'bn'
  | 'mr'
  | 'gu'
  | 'or'
  | 'ml'
  | 'pa'
  | 'as';

type SupportedLanguage = {
  code: LanguageCode;
  name: string;
  speechCode: string;
  placeholder: string;
};

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    code: 'en',
    name: 'English',
    speechCode: 'en-IN',
    placeholder: 'Ask about schemes, loans, eligibility or your business...',
  },
  {
    code: 'hi',
    name: 'हिंदी',
    speechCode: 'hi-IN',
    placeholder: 'सरकारी योजनाओं, कर्ज़ या पात्रता के बारे में पूछें...',
  },
  {
    code: 'te',
    name: 'తెలుగు',
    speechCode: 'te-IN',
    placeholder: 'ప్రభుత్వ పథకాలు, రుణాలు లేదా అర్హత గురించి అడగండి...',
  },
  {
    code: 'ta',
    name: 'தமிழ்',
    speechCode: 'ta-IN',
    placeholder: 'அரசுத் திட்டங்கள், கடன் அல்லது தகுதி பற்றி கேளுங்கள்...',
  },
  {
    code: 'kn',
    name: 'ಕನ್ನಡ',
    speechCode: 'kn-IN',
    placeholder: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು, ಸಾಲ ಅಥವಾ ಅರ್ಹತೆ ಬಗ್ಗೆ ಕೇಳಿ...',
  },
  {
    code: 'bn',
    name: 'বাংলা',
    speechCode: 'bn-IN',
    placeholder: 'সরকারি প্রকল্প, ঋণ বা যোগ্যতা সম্পর্কে জিজ্ঞাসা করুন...',
  },
  {
    code: 'mr',
    name: 'मराठी',
    speechCode: 'mr-IN',
    placeholder: 'सरकारी योजना, कर्ज किंवा पात्रतेबद्दल विचारा...',
  },
  {
    code: 'gu',
    name: 'ગુજરાતી',
    speechCode: 'gu-IN',
    placeholder: 'સરકારી યોજનાઓ, લોન અથવા પાત્રતા વિશે પૂછો...',
  },
  {
    code: 'or',
    name: 'ଓଡ଼ିଆ',
    speechCode: 'or-IN',
    placeholder: 'ସରକାରୀ ଯୋଜନା, ଋଣ କିମ୍ବା ଯୋଗ୍ୟତା ବିଷୟରେ ପଚାରନ୍ତୁ...',
  },
  {
    code: 'ml',
    name: 'മലയാളം',
    speechCode: 'ml-IN',
    placeholder: 'സർക്കാർ പദ്ധതികൾ, വായ്പ അല്ലെങ്കിൽ യോഗ്യതയെക്കുറിച്ച് ചോദിക്കൂ...',
  },
  {
    code: 'pa',
    name: 'ਪੰਜਾਬੀ',
    speechCode: 'pa-IN',
    placeholder: 'ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ, ਕਰਜ਼ੇ ਜਾਂ ਯੋਗਤਾ ਬਾਰੇ ਪੁੱਛੋ...',
  },
  {
    code: 'as',
    name: 'অসমীয়া',
    speechCode: 'as-IN',
    placeholder: 'চৰকাৰী আঁচনি, ঋণ বা যোগ্যতাৰ বিষয়ে সোধক...',
  },
];

/*
|--------------------------------------------------------------------------
| MESSAGE TYPES
|--------------------------------------------------------------------------
*/

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

/*
|--------------------------------------------------------------------------
| QUICK QUESTIONS
|--------------------------------------------------------------------------
|
| These are deliberately practical rather than "AI chatbot" prompts.
|
*/

const QUICK_QUESTIONS = [
  'What government schemes can help me start a small business?',
  'I am an SC entrepreneur. What support can I get?',
  'Can I get a loan for a new manufacturing business?',
  'What documents will I need to apply?',
];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function createMessage(
  role: 'user' | 'assistant',
  content: string
): Message {
  const id =
    String(Date.now()) +
    '-' +
    Math.random().toString(36).slice(2);

  return {
    id: id,
    role: role,
    content: content,
    timestamp: new Date(),
  };
}

function getInitialMessage(language: LanguageCode): string {
  switch (language) {
    case 'hi':
      return 'नमस्ते! मैं Scheme Saathi हूँ। मैं सरकारी योजनाओं को समझने, पात्रता देखने और सही आवेदन मार्ग खोजने में आपकी मदद कर सकता हूँ।';
    case 'te':
      return 'నమస్కారం! నేను Scheme Saathi. ప్రభుత్వ పథకాలను అర్థం చేసుకోవడం, అర్హత తెలుసుకోవడం మరియు సరైన దరఖాస్తు మార్గాన్ని కనుగొనడంలో సహాయం చేస్తాను.';
    case 'ta':
      return 'வணக்கம்! நான் Scheme Saathi. அரசு திட்டங்களைப் புரிந்துகொள்ளவும், தகுதியை அறியவும், சரியான விண்ணப்ப வழியை கண்டுபிடிக்கவும் உதவுகிறேன்.';
    default:
      return 'Namaste! I am Scheme Saathi. I can help you understand government schemes, check what may fit your situation, and find the right application route.';
  }
}

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function SchemeSaathiPage() {
  const [language, setLanguage] = useState<LanguageCode>('en');

  const [messages, setMessages] = useState<Message[]>([
    createMessage(
      'assistant',
      getInitialMessage('en')
    ),
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const [showLanguages, setShowLanguages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const recognitionRef =
    useRef<SpeechRecognition | null>(null);

  /*
  |--------------------------------------------------------------------------
  | CURRENT LANGUAGE
  |--------------------------------------------------------------------------
  */

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((item) => item.code === language) ||
    SUPPORTED_LANGUAGES[0];

  /*
  |--------------------------------------------------------------------------
  | CHECK BROWSER VOICE SUPPORT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      (window as typeof window & {
        webkitSpeechRecognition?: typeof window.SpeechRecognition;
      }).webkitSpeechRecognition;

    setVoiceSupported(Boolean(SpeechRecognition));
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CLEAN UP SPEECH RECOGNITION
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | AUTO SCROLL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  /*
  |--------------------------------------------------------------------------
  | BACKEND HEALTH CHECK
  |--------------------------------------------------------------------------
  */


  /*
  const checkBackend = useCallback(async () => {

      setBackendOnline(true);
      return true;
    } catch {
      /*
      | Some versions of the backend may expose /api/health
      | rather than /health.
      
      try {
        await axios.get(`${BACKEND_URL}/api/health`, {
          timeout: 2500,
        });

        setBackendOnline(true);
        return true;
      } catch {
        setBackendOnline(false);
        return false;
      }
    }
  }, []);
  */

  /*

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);
  */

  /*
  |--------------------------------------------------------------------------
  | SEND MESSAGE
  |--------------------------------------------------------------------------
  */

  const sendMessage = useCallback(
    async (forcedText?: string) => {
      const message = (forcedText ?? input).trim();

      if (!message || isLoading) return;

      const userMessage = createMessage('user', message);

      setMessages((previous) => [
        ...previous,
        userMessage,
      ]);

      setInput('');
      setIsLoading(true);

      try {
        /*
        |--------------------------------------------------------------------------
        | IMPORTANT BACKEND CONTRACT
        |--------------------------------------------------------------------------
        |
        | The backend receives the language.
        |
        | It should NOT blindly let the LLM decide eligibility.
        | SchemeMatch remains the source of truth for eligibility,
        | ranking and allocation.
        |
        */

        const response = await axios.post(
          `${BACKEND_URL}/chat`,
          {
            message,
            user_id: 'guest',
            ps_type: 'scheme',
            language,
            language_name: currentLanguage.name,
          },
          {
            timeout: 15000,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const answer =
          response.data?.response ??
          response.data?.answer ??
          response.data?.message;

        if (!answer) {
          throw new Error(
            'Backend returned no response text.'
          );
        }

        setMessages((previous) => [
          ...previous,
          createMessage('assistant', String(answer)),
        ]);

        setBackendOnline(true);
      } catch (error: any) {
        console.error('Scheme Saathi request failed:', error);

        setBackendOnline(false);

        let errorMessage =
          'I could not reach the Scheme Saathi service right now. Please check that the SchemeMatch backend is running and try again.';

        if (
          axios.isAxiosError(error) &&
          error.code === 'ECONNABORTED'
        ) {
          errorMessage =
            'The service took too long to respond. Please try the question again.';
        }

        setMessages((previous) => [
          ...previous,
          createMessage(
            'assistant',
            errorMessage
          ),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, language, currentLanguage.name]
  );

  /*
  |--------------------------------------------------------------------------
  | VOICE INPUT
  |--------------------------------------------------------------------------
  */

  const startVoice = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      (window as typeof window & {
        webkitSpeechRecognition?: typeof window.SpeechRecognition;
      }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((previous) => [
        ...previous,
        createMessage(
          'assistant',
          'Voice input is not supported by this browser. You can type your question instead.'
        ),
      ]);

      return;
    }

    try {
      const recognition =
        new SpeechRecognition();

      recognition.lang =
        currentLanguage.speechCode;

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsVoiceActive(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript =
          event.results[0]?.[0]?.transcript?.trim();

        if (transcript) {
          setInput(transcript);
          sendMessage(transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error(
          'Speech recognition error:',
          event.error
        );

        setIsVoiceActive(false);
      };

      recognition.onend = () => {
        setIsVoiceActive(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;

      recognition.start();
    } catch (error) {
      console.error(
        'Could not start speech recognition:',
        error
      );

      setIsVoiceActive(false);
    }
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsVoiceActive(false);
  };

  /*
  |--------------------------------------------------------------------------
  | LANGUAGE SELECTION
  |--------------------------------------------------------------------------
  */

  const changeLanguage = (
    nextLanguage: LanguageCode
  ) => {
    setLanguage(nextLanguage);
    setShowLanguages(false);

    setMessages((previous) => [
      ...previous,
      createMessage(
        'assistant',
        getInitialMessage(nextLanguage)
      ),
    ]);
  };

  /*
  |--------------------------------------------------------------------------
  | RESET CHAT
  |--------------------------------------------------------------------------
  */

  const resetChat = () => {
    stopVoice();

    setMessages([
      createMessage(
        'assistant',
        getInitialMessage(language)
      ),
    ]);

    setInput('');
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-[#f5f5f2] text-[#172018]">
      {/* ================================================================
          HEADER
      ================================================================= */}

      <header className="sticky top-0 z-40 border-b border-[#d9ddd7] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176b3a] text-white">
              <Bot size={24} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                Scheme Saathi
              </h1>

              <p className="text-sm text-[#5c665e]">
                Help finding government support for your business
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Backend status */}

            <div className="hidden items-center gap-2 rounded-full border border-[#d9ddd7] bg-[#fafbf9] px-3 py-2 text-xs sm:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  backendOnline === true
                    ? 'bg-green-600'
                    : backendOnline === false
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                }`}
              />

              <span className="text-[#5c665e]">
                {backendOnline === true
                  ? 'Service ready'
                  : backendOnline === false
                    ? 'Service unavailable'
                    : 'Checking service'}
              </span>
            </div>

            {/* Language */}

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowLanguages((value) => !value)
                }
                className="flex items-center gap-2 rounded-xl border border-[#cfd5ce] bg-white px-3 py-2.5 text-sm font-medium hover:bg-[#f5f7f4]"
                aria-label="Choose language"
              >
                <Languages size={18} />
                <span className="hidden sm:inline">
                  {currentLanguage.name}
                </span>
              </button>

              {showLanguages && (
                <div className="absolute right-0 top-full mt-2 max-h-80 w-52 overflow-y-auto rounded-xl border border-[#d9ddd7] bg-white p-2 shadow-xl">
                  {SUPPORTED_LANGUAGES.map(
                    (item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() =>
                          changeLanguage(item.code)
                        }
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${
                          language === item.code
                            ? 'bg-[#e8f2eb] font-semibold text-[#176b3a]'
                            : 'hover:bg-[#f5f7f4]'
                        }`}
                      >
                        {item.name}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={resetChat}
              className="rounded-xl border border-[#cfd5ce] bg-white p-2.5 hover:bg-[#f5f7f4]"
              aria-label="Start new conversation"
              title="Start new conversation"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================
          CONTENT
      ================================================================= */}

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[300px_1fr]">
        {/* ==============================================================
            LEFT: PRACTICAL STARTING POINTS
        =============================================================== */}

        <aside className="h-fit rounded-2xl border border-[#d9ddd7] bg-white p-5">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#176b3a]">
              Start here
            </p>

            <h2 className="mt-1 text-xl font-bold">
              What do you need help with?
            </h2>
          </div>

          <div className="space-y-2">
            {QUICK_QUESTIONS.map(
              (question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() =>
                    sendMessage(question)
                  }
                  disabled={isLoading}
                  className="group w-full rounded-xl border border-[#d9ddd7] bg-[#fafbf9] p-3 text-left text-sm leading-5 transition hover:border-[#176b3a] hover:bg-[#f0f7f2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{question}</span>

                  <ArrowRight
                    size={16}
                    className="mt-2 text-[#176b3a] transition group-hover:translate-x-1"
                  />
                </button>
              )
            )}
          </div>

          <div className="mt-6 border-t border-[#e2e5e1] pt-5">
            <p className="text-sm leading-6 text-[#5c665e]">
              Scheme Saathi helps you understand available
              support. Eligibility and scheme rules should
              always be checked against the official scheme
              information before applying.
            </p>
          </div>
        </aside>

        {/* ==============================================================
            RIGHT: CHAT
        =============================================================== */}

        <section className="flex min-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-2xl border border-[#d9ddd7] bg-white">
          {/* Chat heading */}

          <div className="border-b border-[#e2e5e1] px-5 py-4 sm:px-6">
            <p className="text-sm font-semibold text-[#176b3a]">
              Ask Scheme Saathi
            </p>

            <p className="mt-1 text-sm text-[#5c665e]">
              Tell me about yourself, your business or the
              support you are looking for.
            </p>
          </div>

          {/* Messages */}

          <div
            className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
            aria-live="polite"
          >
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((message) => {
                const isUser =
                  message.role === 'user';

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      isUser
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f2eb] text-[#176b3a]">
                        <Bot size={18} />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3.5 text-[15px] leading-7 ${
                        isUser
                          ? 'bg-[#176b3a] text-white'
                          : 'bg-[#f1f3f0] text-[#172018]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>

                    {isUser && (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e5e8e3] text-[#4d574f]">
                        <User size={18} />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f2eb] text-[#176b3a]">
                    <Bot size={18} />
                  </div>

                  <div className="rounded-2xl bg-[#f1f3f0] px-4 py-3.5">
                    <div className="flex items-center gap-2 text-sm text-[#5c665e]">
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Checking the available information...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ============================================================
              INPUT
          ============================================================= */}

          <div className="border-t border-[#e2e5e1] bg-[#fafbf9] p-4 sm:p-5">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2 rounded-2xl border border-[#cfd5ce] bg-white p-2 shadow-sm focus-within:border-[#176b3a]">
                <textarea
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={
                    currentLanguage.placeholder
                  }
                  rows={1}
                  disabled={isLoading}
                  className="max-h-32 min-h-[48px] flex-1 resize-none border-0 bg-transparent px-3 py-3 text-[15px] outline-none placeholder:text-[#89928b] disabled:cursor-not-allowed"
                  aria-label="Your question"
                />

                {voiceSupported && (
                  <button
                    type="button"
                    onClick={
                      isVoiceActive
                        ? stopVoice
                        : startVoice
                    }
                    disabled={isLoading}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
                      isVoiceActive
                        ? 'bg-red-600 text-white'
                        : 'bg-[#eef1ed] text-[#37423a] hover:bg-[#e3e8e2]'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    aria-label={
                      isVoiceActive
                        ? 'Stop voice input'
                        : 'Start voice input'
                    }
                    title={
                      isVoiceActive
                        ? 'Stop voice input'
                        : `Speak in ${currentLanguage.name}`
                    }
                  >
                    {isVoiceActive ? (
                      <MicOff size={20} />
                    ) : (
                      <Mic size={20} />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={
                    isLoading || !input.trim()
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#176b3a] text-white transition hover:bg-[#12562e] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between px-1 text-xs text-[#7b847d]">
                <span>
                  Enter to send · Shift + Enter for a new line
                </span>

                <span>
                  {currentLanguage.name}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| TYPES FOR BROWSER SPEECH RECOGNITION
|--------------------------------------------------------------------------
|
| Some TypeScript setups do not include SpeechRecognition in lib.dom.d.ts.
| Add this declaration if your project complains about the types.
|
*/

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognition;
    };

    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
  }

  interface SpeechRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;

    start(): void;
    stop(): void;

    onstart:
      | (() => void)
      | null;

    onresult:
      | ((event: SpeechRecognitionEvent) => void)
      | null;

    onerror:
      | ((event: SpeechRecognitionErrorEvent) => void)
      | null;

    onend:
      | (() => void)
      | null;
  }

  interface SpeechRecognitionEvent {
    results: {
      [index: number]: {
        [index: number]: {
          transcript: string;
        };
      };
    };
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
  }
}
