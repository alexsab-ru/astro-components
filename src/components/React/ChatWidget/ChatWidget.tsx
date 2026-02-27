import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Send, User, CheckCircle2 } from "lucide-react";

const ACCENT = "#d40221";

// ──────────────── types ────────────────
interface Message {
  id: string;
  type: "bot" | "user";
  text: string;
}

interface OptionButton {
  label: string;
  value: string;
}

type StepKey =
  | "welcome"
  | "model"
  | "color"
  | "transmission"
  | "tradein"
  | "purchase"
  | "contactName"
  | "contactPhone"
  | "done";

interface StepConfig {
  botMessages: string[];
  options?: OptionButton[];
  inputField?: { placeholder: string; type: string };
  nextStep: (answer: string) => StepKey;
}

// ──────────────── GAC models ────────────────
const GAC_MODELS: OptionButton[] = [
  { label: "GS3", value: "GAC GS3" },
  { label: "GS4", value: "GAC GS4" },
  { label: "GS8", value: "GAC GS8" },
  { label: "M6 Pro", value: "GAC M6 Pro" },
  { label: "M8", value: "GAC M8" },
  { label: "Emkoo", value: "GAC Emkoo" },
  { label: "Emzoom", value: "GAC Emzoom" },
  { label: "GN6", value: "GAC GN6" },
];

// ──────────────── steps builder ────────────────
function buildSteps(a: Record<string, string>): Record<StepKey, StepConfig> {
  return {
    welcome: {
      botMessages: [
        "Здравствуйте! 👋",
        "Я — менеджер GAC Motor. Помогу подобрать автомобиль за пару минут!",
        "Какая модель GAC вас интересует?",
      ],
      options: GAC_MODELS,
      nextStep: () => "color",
    },
    model: {
      botMessages: [],
      nextStep: () => "color",
    },
    color: {
      botMessages: [
        `${a.model || ""} — отличный выбор! 🚗`,
        "В каком цвете вы видите свой будущий автомобиль?",
      ],
      options: [
        { label: "⚪ Белый", value: "Белый" },
        { label: "⚫ Чёрный", value: "Чёрный" },
        { label: "🔘 Серебристый", value: "Серебристый" },
        { label: "🔵 Синий", value: "Синий" },
        { label: "🔴 Красный", value: "Красный" },
        { label: "🟤 Коричневый", value: "Коричневый" },
      ],
      nextStep: () => "transmission",
    },
    transmission: {
      botMessages: ["Отлично! А какая коробка передач вам подходит?"],
      options: [
        { label: "Автомат (AT)", value: "Автомат" },
        { label: "Механика (MT)", value: "Механика" },
        { label: "Робот (AMT)", value: "Робот" },
        { label: "Не принципиально", value: "Любая" },
      ],
      nextStep: () => "tradein",
    },
    tradein: {
      botMessages: [
        "У вас есть автомобиль для обмена по Trade-In?",
        "Мы оценим его по максимальной стоимости и дадим дополнительную скидку 🎁",
      ],
      options: [
        { label: "Да, есть авто на обмен", value: "Да" },
        { label: "Нет, не планирую", value: "Нет" },
        { label: "Хочу узнать подробнее", value: "Подробнее" },
      ],
      nextStep: () => "purchase",
    },
    purchase: {
      botMessages: ["Как вы планируете приобрести автомобиль?"],
      options: [
        { label: "💰 Наличные / перевод", value: "Наличные" },
        { label: "🏦 Автокредит", value: "Кредит" },
        { label: "📋 Лизинг", value: "Лизинг" },
        { label: "Ещё не решил", value: "Не решил" },
      ],
      nextStep: () => "contactName",
    },
    contactName: {
      botMessages: [
        "Замечательно! Я подготовлю персональное предложение 📋",
        "Как я могу к вам обращаться?",
      ],
      inputField: { placeholder: "Введите ваше имя", type: "text" },
      nextStep: () => "contactPhone",
    },
    contactPhone: {
      botMessages: [
        `${a.contactName || ""}, приятно познакомиться! 😊`,
        "Укажите, пожалуйста, ваш номер телефона.",
      ],
      inputField: { placeholder: "+7 (___) ___-__-__", type: "tel" },
      nextStep: () => "done",
    },
    done: {
      botMessages: [
        `Спасибо, ${a.contactName || ""}! Ваша заявка принята ✅`,
        `Итого: ${a.model || ""}, ${a.color || ""}, КПП — ${a.transmission || ""}, оплата — ${a.purchase || ""}.`,
        "Наш менеджер свяжется с вами в течение 15 минут. До встречи в салоне GAC Motor! 🤝",
      ],
      nextStep: () => "done",
    },
  };
}

// ──────────────── component ────────────────
export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<StepKey>("welcome");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showOptions, setShowOptions] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInit = useRef(false);

  // keep latest answers in ref to avoid stale closures
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const scroll = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 80);
  }, []);

  const addBotMessages = useCallback(
    (texts: string[], onDone?: () => void) => {
      setIsTyping(true);
      setShowOptions(false);
      let i = 0;
      const next = () => {
        if (i >= texts.length) {
          setIsTyping(false);
          onDone?.();
          return;
        }
        const text = texts[i];
        i++;
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { id: `bot-${Date.now()}-${i}`, type: "bot", text },
          ]);
          scroll();
          next();
        }, 500 + text.length * 6);
      };
      next();
    },
    [scroll],
  );

  // init on mount
  useEffect(() => {
    if (!hasInit.current) {
      hasInit.current = true;
      const steps = buildSteps({});
      addBotMessages(steps.welcome.botMessages, () => setShowOptions(true));
    }
  }, [addBotMessages]);

  useEffect(() => {
    scroll();
  }, [messages, showOptions, scroll]);

  const handleAnswer = useCallback(
    (stepKey: StepKey, value: string) => {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, type: "user", text: value },
      ]);

      const keyMap: Record<string, string> = {
        welcome: "model",
        model: "model",
        color: "color",
        transmission: "transmission",
        tradein: "tradein",
        purchase: "purchase",
        contactName: "contactName",
        contactPhone: "contactPhone",
      };
      const answerKey = keyMap[stepKey] || stepKey;
      const newAnswers = { ...answersRef.current, [answerKey]: value };
      setAnswers(newAnswers);
      answersRef.current = newAnswers;

      const steps = buildSteps(newAnswers);
      const nextKey = steps[stepKey].nextStep(value);
      setCurrentStep(nextKey);

      if (nextKey === "done") setIsFinished(true);

      const nextCfg = steps[nextKey];
      if (nextCfg && nextCfg.botMessages.length > 0) {
        addBotMessages(nextCfg.botMessages, () => {
          if (nextKey !== "done") setShowOptions(true);
        });
      }
    },
    [addBotMessages],
  );

  const handleInputSubmit = () => {
    const v = inputValue.trim();
    if (!v) return;
    setInputValue("");
    handleAnswer(currentStep, v);
  };

  const steps = buildSteps(answers);
  const cfg = steps[currentStep];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-8">
      <div
        className="flex flex-col rounded-2xl overflow-hidden border border-gray-200 shadow-xl"
        style={{ height: "min(640px, 70vh)" }}
      >
        {/* ─── Header ─── */}
        <div
          className="text-white px-5 py-4 flex items-center gap-3 shrink-0"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #a50019)` }}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 15, fontWeight: 600 }}>Алексей — ваш менеджер</div>
            <div className="flex items-center gap-1.5" style={{ fontSize: 12 }}>
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Онлайн
            </div>
          </div>
          <div
            className="px-3 py-1 rounded-full bg-white/15 hidden sm:block"
            style={{ fontSize: 12 }}
          >
            GAC Motor
          </div>
        </div>

        {/* ─── Messages ─── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-gray-50">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 ${
                  msg.type === "user"
                    ? "text-white rounded-2xl rounded-br-md"
                    : "bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm border border-gray-100"
                }`}
                style={{
                  fontSize: 14,
                  lineHeight: 1.55,
                  ...(msg.type === "user" ? { backgroundColor: ACCENT } : {}),
                }}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}

          {/* typing */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: ACCENT, animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: ACCENT, animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: ACCENT, animationDelay: "300ms" }}
                />
              </div>
            </motion.div>
          )}

          {/* option buttons */}
          {showOptions && !isTyping && cfg?.options && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 pt-1"
            >
              {cfg.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setShowOptions(false);
                    handleAnswer(currentStep, opt.value);
                  }}
                  className="bg-white border px-4 py-2 rounded-full hover:shadow-md transition-all cursor-pointer shadow-sm"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    borderColor: `${ACCENT}40`,
                    color: ACCENT,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}

          {/* done */}
          {isFinished && !isTyping && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center pt-3"
            >
              <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-5 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <div className="text-green-800" style={{ fontSize: 15, fontWeight: 600 }}>
                  Заявка отправлена!
                </div>
                <div className="text-green-600 mt-1" style={{ fontSize: 13 }}>
                  Ожидайте звонка менеджера
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ─── Input area ─── */}
        {showOptions && !isTyping && cfg?.inputField && !isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 sm:px-5 py-3 bg-white border-t border-gray-100 shrink-0"
          >
            <div className="flex gap-2">
              <input
                type={cfg.inputField.type}
                placeholder={cfg.inputField.placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
                className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 outline-none transition-shadow"
                style={{ fontSize: 14 }}
                autoFocus
              />
              <button
                onClick={handleInputSubmit}
                className="w-10 h-10 rounded-full text-white flex items-center justify-center transition-opacity hover:opacity-90 cursor-pointer shrink-0"
                style={{ backgroundColor: ACCENT }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* bottom bar (when no input visible) */}
        {(!showOptions || isTyping || isFinished || !cfg?.inputField) && (
          <div
            className="px-4 py-2.5 bg-white border-t border-gray-100 shrink-0 text-center text-gray-300"
            style={{ fontSize: 11 }}
          >
            GAC Motor · Официальный дилер
          </div>
        )}
      </div>
    </div>
  );
}
