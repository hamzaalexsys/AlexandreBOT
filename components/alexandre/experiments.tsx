"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { bounceAt, pendulumAngle } from "@/lib/physics";
import type { Language, Simulation } from "@/lib/contracts";
import { Sticker } from "./stickers";
export function useTimeline(speed = 1) {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const previous = useRef(0);
  useEffect(() => {
    if (!running) return;
    let id = 0;
    previous.current = 0;
    const tick = (now: number) => {
      if (!previous.current) previous.current = now;
      const dt = (now - previous.current) / 1000;
      if (dt >= 1 / 30) {
        previous.current = now;
        setTime((t) => (t + Math.min(dt, 0.1) * speed) % 12);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running, speed]);
  return {
    time,
    running,
    toggle: () => setRunning((v) => !v),
    reset: () => {
      setTime(0);
      setRunning(false);
    },
    setTime,
  };
}
export function ExperimentDrawing({
  settings,
  time,
  lang,
  onSelect,
  onChange,
}: {
  settings: Simulation;
  time: number;
  lang: Language;
  onSelect: (label: string) => void;
  onChange: (s: Simulation) => void;
}) {
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  const hit = (label: string) => ({
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    onClick: () => onSelect(label),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(label);
      }
    },
  });
  if (settings.type === "bounce") {
    const state = bounceAt(time, settings);
    const trajectory = Array.from({ length: 121 }, (_, i) => {
      const s = i / 15;
      return `${80 + s * 78},${390 - bounceAt(s, settings).height * 56}`;
    }).join(" ");
    const x = 80 + Math.min(time, 8) * 78,
      y = 390 - state.height * 56;
    return (
      <g>
        <rect width="800" height="500" fill="#edf8ff" />
        <g transform="translate(670 85) scale(.7)">
          <Sticker kind="sun" />
        </g>
        <g opacity=".7" transform="translate(160 85) scale(.7)">
          <Sticker kind="cloud" />
        </g>
        <path
          d="M0 419Q130 364 290 419Q460 362 800 413V500H0Z"
          fill="#d7ecce"
        />
        <path
          d="M0 449Q250 406 490 450Q680 403 800 453V500H0Z"
          fill="#c4dfb5"
        />
        <path
          d="M60 418H750"
          stroke="#83b78c"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {[1, 2, 3, 4, 5].map((h) => (
          <g key={h}>
            <path
              d={`M60 ${390 - h * 56}H740`}
              stroke="#dae5ee"
              strokeDasharray="5 8"
            />
            <text x="35" y={395 - h * 56} fontSize="15" fill="#8a9bb0">
              {h}m
            </text>
          </g>
        ))}
        <polyline
          points={trajectory}
          fill="none"
          stroke="#a69bea"
          strokeWidth="4"
          strokeDasharray="7 8"
          {...hit(
            t(
              "La trajectoire violette montre le chemin suivi par le ballon au fil du temps.",
              "المسار البنفسجي يبيّن الطريق الذي تسلكه الكرة مع مرور الوقت.",
            ),
          )}
        />
        <ellipse
          cx={x}
          cy="416"
          rx={18 + (5 - state.height) * 2}
          ry="5"
          fill="#759c87"
          opacity=".23"
        />
        <g
          transform={`translate(${x} ${y}) scale(.65)`}
          {...hit(
            t(
              `Le ballon est à ${state.height.toFixed(1)} mètre. Il a rebondi ${state.bounces} fois.`,
              `الكرة على ارتفاع ${state.height.toFixed(1)} متر. ارتدّت ${state.bounces} مرات.`,
            ),
          )}
        >
          <Sticker kind="ball" />
        </g>
        <text x="400" y="475" textAnchor="middle" fontSize="18" fill="#66798c">
          {t(
            "La ligne violette, c’est sa trajectoire !",
            "الخط البنفسجي هو مسارها!",
          )}
        </text>
        <g transform="translate(720 393) scale(.5)">
          <Sticker kind="plant" />
        </g>
      </g>
    );
  }
  if (settings.type === "orbit") {
    const a = (time * Math.PI) / 4,
      x = 400 + 238 * Math.cos(a),
      y = 245 + 126 * Math.sin(a);
    return (
      <g>
        <rect width="800" height="500" fill="#272c50" />
        {Array.from({ length: 28 }, (_, i) => (
          <circle
            key={i}
            cx={(i * 137 + 20) % 780}
            cy={(i * 79 + 10) % 460}
            r={i % 3 === 0 ? 2 : 1}
            fill="#b3b9e4"
          />
        ))}
        <ellipse
          cx="400"
          cy="245"
          rx="238"
          ry="126"
          stroke="#69699b"
          strokeWidth="3"
          strokeDasharray="7 9"
          fill="none"
        />
        <g
          transform="translate(400 245)"
          {...hit(
            t(
              "Le Soleil attire la planète par la gravité.",
              "تجذب الشمس الكوكب بفعل الجاذبية.",
            ),
          )}
        >
          <Sticker kind="sun" />
        </g>
        <g
          transform={`translate(${x} ${y})`}
          {...hit(
            t(
              "La planète se déplace autour du Soleil. La taille et la distance ne sont pas à l’échelle.",
              "يدور الكوكب حول الشمس. الحجم والمسافة غير ممثّلين بمقياس حقيقي.",
            ),
          )}
        >
          <circle r="28" fill="#7cc9e8" />
          <path
            d="M-14-23Q8-30 14-8L0 0L9 16L-5 27L-21 12L-7-1Z"
            fill="#72ad83"
          />
          <circle cx="-9" cy="-4" r="2" fill="#34477a" />
          <circle cx="9" cy="-4" r="2" fill="#34477a" />
        </g>
        <text x="400" y="450" textAnchor="middle" fontSize="18" fill="#c9c9ee">
          {t(
            "Une orbite circulaire vue de côté · sans échelle",
            "مدار دائري من الجانب · دون مقياس",
          )}
        </text>
      </g>
    );
  }
  if (settings.type === "pendulum") {
    const length = settings.length || 1.5,
      angle = pendulumAngle(time, length),
      arm = 100 + length * 60,
      x = 400 + Math.sin(angle) * arm,
      y = 95 + Math.cos(angle) * arm;
    return (
      <g>
        <rect width="800" height="500" fill="#fff8e7" />
        <path d="M0 433Q200 400 430 438T800 425V500H0" fill="#d8ecd9" />
        <path
          d="M215 410L295 65H505L585 410"
          stroke="#a29ada"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />
        <path d={`M400 82L${x} ${y}`} stroke="#c6a16e" strokeWidth="5" />
        <path
          d={`M${x - 37} ${y + 10}h74`}
          stroke="#c4825f"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <g
          transform={`translate(${x} ${y - 19}) scale(.75)`}
          {...hit(
            t(
              "La balançoire avance et revient. Avec une corde plus longue, chaque aller-retour prend plus de temps.",
              "تتحرّك الأرجوحة ذهاباً وإياباً. مع حبل أطول، تستغرق كل حركة وقتاً أكثر.",
            ),
          )}
        >
          <Sticker kind="fox" />
        </g>
        <text x="400" y="477" textAnchor="middle" fontSize="18" fill="#827795">
          {t(
            "Une corde plus longue… un mouvement plus lent.",
            "حبل أطول… حركة أبطأ.",
          )}
        </text>
      </g>
    );
  }
  if (settings.type === "fractions") {
    const n = settings.parts || 4,
      selected = Math.min(n, settings.selected ?? 2);
    const sector = (i: number) => {
      const a = (2 * Math.PI * i) / n - Math.PI / 2,
        b = (2 * Math.PI * (i + 1)) / n - Math.PI / 2;
      return `M400 235L${400 + 140 * Math.cos(a)} ${235 + 140 * Math.sin(a)}A140 140 0 0 1 ${400 + 140 * Math.cos(b)} ${235 + 140 * Math.sin(b)}Z`;
    };
    return (
      <g>
        <rect width="800" height="500" fill="#fff6e7" />
        <ellipse cx="400" cy="245" rx="172" ry="170" fill="#f3e9d9" />
        <circle cx="400" cy="235" r="156" fill="#ebae60" />
        {Array.from({ length: n }, (_, i) => (
          <g
            key={i}
            role="button"
            tabIndex={0}
            aria-label={t(
              `Choisir ${i + 1} parts sur ${n}`,
              `اختيار ${i + 1} أجزاء من ${n}`,
            )}
            onClick={() => onChange({ ...settings, selected: i + 1 })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange({ ...settings, selected: i + 1 });
              }
            }}
          >
            <path
              d={sector(i)}
              fill={i < selected ? "#ffc665" : "#fff0c9"}
              stroke="#fff8e9"
              strokeWidth="5"
            />
            {i < selected ? (
              <circle
                cx={
                  400 +
                  85 * Math.cos(((i + 0.5) * 2 * Math.PI) / n - Math.PI / 2)
                }
                cy={
                  235 +
                  85 * Math.sin(((i + 0.5) * 2 * Math.PI) / n - Math.PI / 2)
                }
                r="14"
                fill="#ef8260"
              />
            ) : null}
          </g>
        ))}
        <text x="400" y="447" textAnchor="middle" fontSize="27" fill="#976539">
          {selected}/{n} —{" "}
          {t(`${selected} parts sur ${n}`, `${selected} أجزاء من ${n}`)}
        </text>
      </g>
    );
  }
  if (settings.type === "color") {
    const red = settings.red ?? 255;
    const green = settings.green ?? 95;
    const blue = settings.blue ?? 145;
    const mixed = `rgb(${red}, ${green}, ${blue})`;
    const hex = `#${[red, green, blue]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")}`.toUpperCase();
    return (
      <g>
        <defs>
          <radialGradient id="color-lab-bg">
            <stop offset="0" stopColor="#443b76" />
            <stop offset="1" stopColor="#1f1a3b" />
          </radialGradient>
          <filter id="color-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="800" height="500" fill="url(#color-lab-bg)" />
        {Array.from({ length: 22 }, (_, i) => (
          <circle
            key={i}
            cx={(i * 97 + 23) % 790}
            cy={(i * 61 + 18) % 475}
            r={i % 4 === 0 ? 2.5 : 1.3}
            fill="#fff8d9"
            opacity={0.35 + (i % 3) * 0.18}
          />
        ))}
        <text x="400" y="50" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">
          {t("Trois lumières fabriquent une couleur", "ثلاثة أضواء تصنع لوناً")}
        </text>
        {[
          { x: 235, value: red, color: `rgb(${red},0,0)`, label: "R", name: t("lumière rouge", "الضوء الأحمر") },
          { x: 400, value: green, color: `rgb(0,${green},0)`, label: "V", name: t("lumière verte", "الضوء الأخضر") },
          { x: 565, value: blue, color: `rgb(0,0,${blue})`, label: "B", name: t("lumière bleue", "الضوء الأزرق") },
        ].map((lamp) => (
          <g
            key={lamp.label}
            {...hit(t(`La ${lamp.name} vaut ${lamp.value} sur 255.`, `${lamp.name} شدته ${lamp.value} من 255.`))}
          >
            <path d={`M${lamp.x} 112L365 292H435Z`} fill={lamp.color} opacity=".23" />
            <circle cx={lamp.x} cy="112" r="38" fill={lamp.color} filter="url(#color-glow)" />
            <text x={lamp.x} y="119" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff">
              {lamp.label}
            </text>
          </g>
        ))}
        <circle cx="400" cy="306" r="112" fill={mixed} opacity=".22" filter="url(#color-glow)" />
        <circle
          cx="400"
          cy="306"
          r="83"
          fill={mixed}
          stroke="#fff"
          strokeWidth="5"
          {...hit(t(`La couleur obtenue est ${hex}.`, `اللون الناتج هو ${hex}.`))}
        />
        <path d="M330 411Q400 441 470 411" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".75" />
        <text x="400" y="462" textAnchor="middle" fontSize="23" fontWeight="900" fill="#fff">
          {hex}
        </text>
      </g>
    );
  }
  if (settings.type === "geometry") {
    const sides = settings.sides ?? 5;
    const rotation = ((settings.rotation ?? 0) + time * 10) * (Math.PI / 180);
    const points = Array.from({ length: sides }, (_, i) => {
      const angle = rotation + (i * Math.PI * 2) / sides - Math.PI / 2;
      return { x: 400 + Math.cos(angle) * 148, y: 240 + Math.sin(angle) * 148 };
    });
    const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");
    const names: Record<number, [string, string]> = {
      3: ["triangle", "مثلث"],
      4: ["quadrilatère", "شكل رباعي"],
      5: ["pentagone", "خماسي الأضلاع"],
      6: ["hexagone", "سداسي الأضلاع"],
      7: ["heptagone", "سباعي الأضلاع"],
      8: ["octogone", "ثماني الأضلاع"],
    };
    return (
      <g>
        <defs>
          <linearGradient id="geometry-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd078" />
            <stop offset=".48" stopColor="#ff8f82" />
            <stop offset="1" stopColor="#a898ef" />
          </linearGradient>
          <filter id="geometry-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#6d5c98" floodOpacity=".24" />
          </filter>
        </defs>
        <rect width="800" height="500" fill="#fff9ee" />
        <path d="M0 420Q180 370 360 426T800 410V500H0Z" fill="#e6f2df" />
        <g opacity=".22">
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={60 + i * 92} cy={72 + (i % 2) * 25} r={10 + (i % 3) * 5} fill="#a898ef" />
          ))}
        </g>
        <polygon points={pointString} fill="url(#geometry-fill)" stroke="#69558d" strokeWidth="7" strokeLinejoin="round" filter="url(#geometry-shadow)" {...hit(t(`C’est un ${names[sides][0]} régulier : tous ses côtés et ses angles sont égaux.`, `هذا ${names[sides][1]} منتظم: أضلاعه وزواياه متساوية.`))} />
        {points.map((point, i) => (
          <g key={i} {...hit(t(`Sommet ${i + 1} sur ${sides}`, `الرأس ${i + 1} من ${sides}`))}>
            <circle cx={point.x} cy={point.y} r="15" fill="#fff" stroke="#69558d" strokeWidth="5" />
            <text x={point.x} y={point.y + 5} textAnchor="middle" fontSize="13" fontWeight="900" fill="#69558d">
              {i + 1}
            </text>
          </g>
        ))}
        <g transform="translate(670 375) scale(.52)">
          <Sticker kind="fox" />
        </g>
        <text x="400" y="45" textAnchor="middle" fontSize="21" fontWeight="900" fill="#69558d">
          {t(names[sides][0].toLocaleUpperCase("fr"), names[sides][1])}
        </text>
        <text x="400" y="458" textAnchor="middle" fontSize="19" fontWeight="800" fill="#675985">
          {t(`${sides} côtés · ${sides} sommets`, `${sides} أضلاع · ${sides} رؤوس`)}
        </text>
      </g>
    );
  }
  if (settings.type === "numberline") {
    const start = settings.start ?? -2;
    const jump = settings.jump ?? 5;
    const target = start + jump;
    const toX = (value: number) => 400 + value * 31;
    const progress = (Math.sin(time * Math.PI - Math.PI / 2) + 1) / 2;
    const x = toX(start + jump * progress);
    const y = 287 - Math.sin(progress * Math.PI) * Math.min(115, 45 + Math.abs(jump) * 11);
    const direction = jump >= 0 ? 1 : -1;
    return (
      <g>
        <defs>
          <linearGradient id="numberline-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dff4ff" />
            <stop offset="1" stopColor="#fff8dd" />
          </linearGradient>
        </defs>
        <rect width="800" height="500" fill="url(#numberline-sky)" />
        <path d="M0 372Q180 330 370 377T800 360V500H0Z" fill="#cbe8ba" />
        <path d="M90 310H710" stroke="#665785" strokeWidth="6" strokeLinecap="round" />
        <path d="M80 310l18-11v22Z" fill="#665785" />
        <path d="M720 310l-18-11v22Z" fill="#665785" />
        {Array.from({ length: 21 }, (_, i) => i - 10).map((value) => {
          const canStartHere = value >= -5 && value <= 5;
          const choose = () => onChange({ ...settings, start: value });
          return (
          <g
            key={value}
            {...(canStartHere
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": t(
                    `Nombre ${value}. Touche pour commencer ici.`,
                    `العدد ${value}. المسه للبدء من هنا.`,
                  ),
                  onClick: choose,
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      choose();
                    }
                  },
                }
              : {})}
          >
            <path d={`M${toX(value)} 294V326`} stroke={value === start || value === target ? "#f06f51" : "#665785"} strokeWidth={value === start || value === target ? 5 : 3} />
            <text x={toX(value)} y="351" textAnchor="middle" fontSize="15" fontWeight={value === start || value === target ? 900 : 700} fill={value === start || value === target ? "#d8523d" : "#665785"}>
              {value}
            </text>
          </g>
          );
        })}
        <path
          d={`M${toX(start)} 278Q${(toX(start) + toX(target)) / 2} ${180 - Math.abs(jump) * 5} ${toX(target)} 278`}
          fill="none"
          stroke="#a18ee5"
          strokeWidth="5"
          strokeDasharray="9 8"
        />
        <g transform={`translate(${x} ${y}) scale(.48) rotate(${direction * 7})`} {...hit(t(`Milo saute de ${start} jusqu’à ${target}.`, `يقفز ميلو من ${start} إلى ${target}.`))}>
          <Sticker kind="fox" />
        </g>
        <text x="400" y="64" textAnchor="middle" fontSize="31" fontWeight="900" fill="#5b4c7c">
          {start} {jump >= 0 ? "+" : "−"} {Math.abs(jump)} = {target}
        </text>
        <text x="400" y="111" textAnchor="middle" fontSize="18" fontWeight="800" fill="#8a78ad">
          {jump >= 0
            ? t(`Avance de ${jump} bonds !`, `تقدّم ${jump} قفزات!`)
            : t(`Recule de ${Math.abs(jump)} bonds !`, `تراجع ${Math.abs(jump)} قفزات!`)}
        </text>
        <g transform="translate(685 405) scale(.34)">
          <Sticker kind="star" />
        </g>
      </g>
    );
  }
  const stage = Math.floor(time / 3) % 4;
  return (
    <g>
      <rect width="800" height="500" fill="#eaf7ff" />
      <path d="M0 355Q150 325 320 362T800 352V500H0" fill="#8ccfe2" />
      <path
        d="M0 386Q130 359 280 391T800 382"
        stroke="#b8e7ed"
        fill="none"
        strokeWidth="4"
      />
      <g
        transform="translate(128 107) scale(.8)"
        {...hit(
          t(
            "La chaleur du Soleil permet l’évaporation.",
            "تساعد حرارة الشمس على التبخّر.",
          ),
        )}
      >
        <Sticker kind="sun" />
      </g>
      <g
        transform="translate(473 107) scale(1.5)"
        {...hit(
          t(
            "La vapeur se refroidit et se condense en petites gouttes dans les nuages.",
            "يبرد البخار ويتكاثف إلى قطرات صغيرة داخل السحب.",
          ),
        )}
      >
        <Sticker kind="cloud" />
      </g>
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i} opacity={stage === 0 || stage === 1 ? 0.85 : 0.25}>
          <path
            d={`M${190 + i * 30} ${315 - ((time * 30 + i * 20) % 150)}q-14-17 0-35`}
            stroke="#d0a569"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <g
          key={i}
          opacity={stage >= 2 ? 1 : 0.2}
          transform={`translate(${424 + i * 35} ${175 + ((time * 65 + i * 17) % 150)}) scale(.18)`}
        >
          <Sticker kind="water" />
        </g>
      ))}
      <text x="230" y="205" textAnchor="middle" fontSize="19" fill="#a88452">
        {t("Évaporation ↑", "التبخّر ↑")}
      </text>
      <text x="490" y="55" textAnchor="middle" fontSize="19" fill="#698ca5">
        {t("Condensation", "التكاثف")}
      </text>
      <text x="622" y="260" textAnchor="middle" fontSize="19" fill="#5c97b3">
        {t("Pluie ↓", "المطر ↓")}
      </text>
      <text x="400" y="456" textAnchor="middle" fontSize="19" fill="#397b95">
        {t(
          "L’eau circule… et le voyage recommence !",
          "تدور المياه… وتبدأ الرحلة من جديد!",
        )}
      </text>
    </g>
  );
}
export function ExperimentControls({
  settings,
  lang,
  time,
  running,
  onToggle,
  onReset,
  onChange,
}: {
  settings: Simulation;
  lang: Language;
  time: number;
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
  onChange: (s: Simulation) => void;
}) {
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  function range(
    key: keyof Simulation,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    unit = "",
  ) {
    return (
      <label className="experiment-range">
        <span>
          {label}
          <strong>
            {value}
            {unit}
          </strong>
        </span>
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            onReset();
            onChange({ ...settings, [key]: Number(e.target.value) });
          }}
        />
      </label>
    );
  }
  return (
    <div className="experiment-controls">
      <div className="play-row">
        {settings.type !== "fractions" && settings.type !== "color" ? (
          <>
            <button className="play-button" onClick={onToggle}>
              {running ? <Pause size={18} /> : <Play size={18} />}{" "}
              {running ? t("Pause", "توقّف") : t("C’est parti !", "هيا نبدأ!")}
            </button>
            <button
              className="icon-button"
              onClick={onReset}
              aria-label={t("Recommencer l’expérience", "إعادة التجربة")}
            >
              <RotateCcw size={19} />
            </button>
            <span>{time.toFixed(1)} s</span>
          </>
        ) : settings.type === "fractions" ? (
          <span className="experiment-hint">
            {t("Touche une part de pizza !", "المس قطعة بيتزا!")}
          </span>
        ) : (
          <span className="experiment-hint">
            {t("Fais glisser les lumières !", "حرّك أشرطة الضوء!")}
          </span>
        )}
        <span className="experiment-badge">
          {t("À toi d’essayer", "جرّب بنفسك")}
        </span>
      </div>
      <div className="experiment-sliders">
        {settings.type === "color" ? (
          <>
            {range("red", t("Rouge", "أحمر"), 0, 255, 1, settings.red ?? 255)}
            {range("green", t("Vert", "أخضر"), 0, 255, 1, settings.green ?? 95)}
            {range("blue", t("Bleu", "أزرق"), 0, 255, 1, settings.blue ?? 145)}
          </>
        ) : settings.type === "geometry" ? (
          <>
            {range("sides", t("Nombre de côtés", "عدد الأضلاع"), 3, 8, 1, settings.sides ?? 5)}
            {range("rotation", t("Tourner la forme", "تدوير الشكل"), 0, 360, 15, settings.rotation ?? 0, "°")}
          </>
        ) : settings.type === "numberline" ? (
          <>
            {range("start", t("Je pars de", "أبدأ من"), -5, 5, 1, settings.start ?? -2)}
            {range("jump", t("Mon saut", "قفزتي"), -5, 5, 1, settings.jump ?? 5)}
          </>
        ) : settings.type === "bounce" ? (
          <>
            {range(
              "height",
              t("Hauteur de départ", "ارتفاع البداية"),
              1,
              5,
              0.5,
              settings.height || 3,
              " m",
            )}
            {range(
              "elasticity",
              t("Rebond du ballon", "ارتداد الكرة"),
              0.2,
              0.95,
              0.05,
              settings.elasticity || 0.75,
            )}
            <label className="experiment-range">
              <span>{t("Sur quelle planète ?", "على أيّ كوكب؟")}</span>
              <select
                aria-label={t("Gravité", "الجاذبية")}
                value={settings.gravity || 9.81}
                onChange={(e) => {
                  onReset();
                  onChange({ ...settings, gravity: Number(e.target.value) });
                }}
              >
                <option value={9.81}>{t("La Terre", "الأرض")}</option>
                <option value={1.62}>{t("La Lune", "القمر")}</option>
              </select>
            </label>
          </>
        ) : settings.type === "fractions" ? (
          <>
            {range(
              "parts",
              t("Nombre de parts", "عدد الأجزاء"),
              2,
              12,
              1,
              settings.parts || 4,
            )}
            {range(
              "selected",
              t("Parts choisies", "الأجزاء المختارة"),
              0,
              settings.parts || 4,
              1,
              Math.min(settings.selected ?? 2, settings.parts || 4),
            )}
          </>
        ) : settings.type === "pendulum" ? (
          range(
            "length",
            t("Longueur de la corde", "طول الحبل"),
            0.5,
            2.5,
            0.1,
            settings.length || 1.5,
            " m",
          )
        ) : (
          range(
            "speed",
            t("Vitesse de l’animation", "سرعة الحركة"),
            0.25,
            2,
            0.25,
            settings.speed || 1,
            "×",
          )
        )}
      </div>
      {settings.type === "bounce" ? (
        <p className="simulation-note">
          {t(
            "Modèle simplifié : sans résistance de l’air. Le ballon avance aussi horizontalement.",
            "نموذج مبسّط دون مقاومة الهواء. تتحرّك الكرة أفقياً أيضاً.",
          )}
        </p>
      ) : null}
    </div>
  );
}
