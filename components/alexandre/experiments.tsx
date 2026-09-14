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
          <Sticker kind="cat" />
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
        {settings.type !== "fractions" ? (
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
        ) : (
          <span className="experiment-hint">
            {t("Touche une part de pizza !", "المس قطعة بيتزا!")}
          </span>
        )}
        <span className="experiment-badge">
          {t("À toi d’essayer", "جرّب بنفسك")}
        </span>
      </div>
      <div className="experiment-sliders">
        {settings.type === "bounce" ? (
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
