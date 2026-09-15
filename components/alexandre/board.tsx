"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent,
  type CSSProperties,
} from "react";
import {
  MousePointer2,
  Pencil,
  Undo2,
  Send,
  X,
  Paintbrush,
  RotateCcw,
} from "lucide-react";
import type {
  ChildDrawingContext,
  Scene,
  Language,
  Stroke,
  Shape,
} from "@/lib/contracts";
import { Sticker } from "./stickers";
import {
  ExperimentDrawing,
  ExperimentControls,
  useTimeline,
} from "./experiments";

export type BoardHandle = {
  capture: () => Promise<string>;
};

export const Board = forwardRef<BoardHandle, {
  scene: Scene;
  onChange: (scene: Scene) => void;
  onAsk: (
    message: string,
    image?: string,
    selected?: string,
    childDrawing?: ChildDrawingContext,
  ) => void;
  lang: Language;
  busy: boolean;
  strokes?: Stroke[];
  onStrokes?: (strokes: Stroke[]) => void;
}>(function Board({
  scene,
  onChange,
  onAsk,
  lang,
  busy,
  strokes = [],
  onStrokes = () => {},
}, ref) {
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<"select" | "draw">(
    scene.shapes.length || scene.simulation ? "select" : "draw",
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [insight, setInsight] = useState("");
  const [replay, setReplay] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(false);
  const dragged = useRef<string | null>(null);
  const paths = useRef(strokes);
  useEffect(() => {
    paths.current = strokes;
  }, [strokes]);
  const timeline = useTimeline(scene.simulation?.speed || 1);
  const selectedShape = scene.shapes.find((s) => s.id === selected);
  function point(event: PointerEvent<SVGSVGElement>) {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    return {
      x: Math.max(0, Math.min(800, p.x)),
      y: Math.max(0, Math.min(500, p.y)),
    };
  }
  function down(event: PointerEvent<SVGSVGElement>) {
    if (mode !== "draw" || strokes.length >= 80) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    active.current = true;
    const p = point(event);
    onStrokes([
      ...strokes,
      { points: `${p.x},${p.y} ${p.x},${p.y}`, color: "#7f72ce" },
    ]);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const p = point(event);
    if (dragged.current) {
      onChange({
        ...scene,
        shapes: scene.shapes.map((s) =>
          s.id === dragged.current
            ? {
                ...s,
                x: Math.max(50, Math.min(700, p.x)),
                y: Math.max(50, Math.min(400, p.y)),
              }
            : s,
        ),
      });
      return;
    }
    if (!active.current) return;
    onStrokes(
      paths.current.map((stroke, i) =>
        i === paths.current.length - 1 && stroke.points.length < 10000
          ? {
              ...stroke,
              points: `${stroke.points} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
            }
          : stroke,
      ),
    );
  }
  function select(shape: Shape) {
    setSelected(shape.id);
    setInsight(shape.reveal || shape.label || shape.text || "");
  }
  const captureBoard = useCallback(async () => {
    if (!svgRef.current) throw new Error("BOARD_UNAVAILABLE");
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "800");
    clone.setAttribute("height", "500");
    clone.querySelectorAll("[data-hit]").forEach((node) => node.remove());
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], {
        type: "image/svg+xml",
      }),
    );
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("BOARD_CAPTURE_FAILED"));
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 500;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("BOARD_CAPTURE_FAILED");
      context.fillStyle = "#fffdf9";
      context.fillRect(0, 0, 800, 500);
      context.drawImage(image, 0, 0);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  useImperativeHandle(ref, () => ({ capture: captureBoard }), [captureBoard]);

  async function askDrawing() {
    setCapturing(true);
    setError("");
    try {
      onAsk(
        t(
          "Regarde notre tableau et mon dessin. Aide-moi à comprendre ce que j’ai fait.",
          "انظر إلى لوحتنا ورسمي. ساعدني على فهم ما فعلته.",
        ),
        await captureBoard(),
        insight || undefined,
        strokes.length ? { strokeCount: strokes.length } : undefined,
      );
    } catch {
      setError(
        t(
          "Le dessin n’a pas pu être envoyé. Réessaie.",
          "تعذّر إرسال الرسم. حاول مجدداً.",
        ),
      );
    } finally {
      setCapturing(false);
    }
  }
  const isConceptLab = ["color", "geometry", "numberline"].includes(
    scene.simulation?.type || "",
  );
  return (
    <section
      className={`magic-board ${isConceptLab ? "concept-lab-board" : ""}`}
      aria-label={t("Le tableau de Milo", "لوحة ميلو")}
    >
      <div className="board-caption">
        <div>
          <span className="little-label">
            {t("LE TABLEAU DE MILO", "لوحة ميلو")}
          </span>
          <h2>{scene.title}</h2>
          <p>{scene.subtitle}</p>
        </div>
        <div className="board-caption-actions">
          {isConceptLab ? (
            <span className="lab-live"><i /> {t("LABO INTERACTIF", "مختبر تفاعلي")}</span>
          ) : null}
          <button
            className="icon-button"
            onClick={() => {
              timeline.reset();
              setReplay((v) => v + 1);
            }}
            aria-label={t("Rejouer les animations", "إعادة الحركة")}
          >
            <RotateCcw size={19} />
          </button>
        </div>
      </div>
      <div className="scene-canvas">
        {!scene.shapes.length && !scene.simulation && !strokes.length ? (
          <div className="empty-board-coach" aria-hidden="true">
            <span>✎</span>
            <strong>{t("Ton crayon est prêt !", "قلمك جاهز!")}</strong>
            <small>
              {t(
                "Dessine ici, puis pose ta question à Milo.",
                "ارسم هنا، ثم اطرح سؤالك على ميلو.",
              )}
            </small>
          </div>
        ) : null}
        <svg
          ref={svgRef}
          viewBox="0 0 800 500"
          className={`drawing-surface ${mode === "draw" ? "pen-active" : ""}`}
          style={{
            touchAction:
              mode === "draw" || scene.shapes.some((s) => s.draggable)
                ? "none"
                : "pan-y",
          }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={() => {
            active.current = false;
            dragged.current = null;
          }}
          onPointerCancel={() => {
            active.current = false;
            dragged.current = null;
          }}
          role="group"
          aria-label={scene.title}
        >
          <rect width="800" height="500" fill="#fffdf9" />
          {scene.simulation ? (
            <ExperimentDrawing
              settings={scene.simulation}
              lang={lang}
              time={timeline.time}
              onSelect={(label) => {
                if (mode === "select") {
                  setSelected(null);
                  setInsight(label);
                }
              }}
              onChange={(simulation) => {
                if (mode === "select") onChange({ ...scene, simulation });
              }}
            />
          ) : null}
          <g key={replay}>
            {scene.shapes.map((shape, i) => {
              const size = shape.r || 40;
              const hasAction = shape.label || shape.reveal || shape.draggable;
              return (
                <g
                  key={shape.id}
                  transform={`translate(${shape.x} ${shape.y})`}
                >
                  <g
                    className={`scene-object ${shape.animation ? `motion-${shape.animation.type}` : ""}`}
                    style={
                      {
                        "--motion-time": `${shape.animation?.duration || 3}s`,
                        "--motion-distance": `${shape.animation?.distance || 15}px`,
                        animationDelay: `${i * 40}ms`,
                      } as CSSProperties
                    }
                  >
                    {shape.kind === "sticker" ? (
                      <g transform={`scale(${size / 40})`}>
                        <Sticker kind={shape.sticker} />
                      </g>
                    ) : shape.kind === "path" ? (
                      <path
                        d={shape.path || ""}
                        fill={shape.fill}
                        stroke={shape.fill}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : shape.kind === "circle" ? (
                      <circle r={size} fill={shape.fill} />
                    ) : shape.kind === "rect" ? (
                      <rect
                        width={shape.w || 80}
                        height={shape.h || 60}
                        rx="12"
                        fill={shape.fill}
                      />
                    ) : shape.kind === "line" ? (
                      <line
                        x2={shape.w || 0}
                        y2={shape.h || 0}
                        stroke={shape.fill}
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                    ) : (
                      <text
                        textAnchor="middle"
                        fill={shape.fill}
                        fontSize="24"
                        fontWeight="700"
                        fontFamily="Nunito, Noto Sans Arabic, sans-serif"
                        direction={lang === "ar" ? "rtl" : "ltr"}
                      >
                        {shape.text}
                      </text>
                    )}
                    {hasAction ? (
                      <rect
                        data-hit="true"
                        x={
                          shape.kind === "circle" || shape.kind === "sticker"
                            ? -size - 8
                            : shape.kind === "text"
                              ? -100
                              : -6
                        }
                        y={
                          shape.kind === "circle" || shape.kind === "sticker"
                            ? -size - 8
                            : shape.kind === "text"
                              ? -30
                              : -6
                        }
                        width={
                          shape.kind === "circle" || shape.kind === "sticker"
                            ? size * 2 + 16
                            : shape.kind === "text"
                              ? 200
                              : (shape.w || 60) + 12
                        }
                        height={
                          shape.kind === "circle" || shape.kind === "sticker"
                            ? size * 2 + 16
                            : shape.kind === "text"
                              ? 44
                              : (shape.h || 40) + 12
                        }
                        rx="15"
                        fill="transparent"
                        stroke={
                          selected === shape.id ? "#9786e1" : "transparent"
                        }
                        strokeWidth="3"
                        strokeDasharray="6 5"
                        tabIndex={mode === "select" ? 0 : -1}
                        role="button"
                        aria-label={shape.label || shape.text || shape.id}
                        className="shape-hit"
                        onClick={() => {
                          if (mode === "select") select(shape);
                        }}
                        onPointerDown={(event) => {
                          if (mode === "select" && shape.draggable) {
                            dragged.current = shape.id;
                            svgRef.current?.setPointerCapture(event.pointerId);
                            select(shape);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            select(shape);
                          }
                          if (
                            shape.draggable &&
                            [
                              "ArrowLeft",
                              "ArrowRight",
                              "ArrowUp",
                              "ArrowDown",
                            ].includes(e.key)
                          ) {
                            e.preventDefault();
                            onChange({
                              ...scene,
                              shapes: scene.shapes.map((s) =>
                                s.id === shape.id
                                  ? {
                                      ...s,
                                      x: Math.max(
                                        40,
                                        Math.min(
                                          720,
                                          s.x +
                                            (e.key === "ArrowLeft"
                                              ? -10
                                              : e.key === "ArrowRight"
                                                ? 10
                                                : 0),
                                        ),
                                      ),
                                      y: Math.max(
                                        40,
                                        Math.min(
                                          440,
                                          s.y +
                                            (e.key === "ArrowUp"
                                              ? -10
                                              : e.key === "ArrowDown"
                                                ? 10
                                                : 0),
                                        ),
                                      ),
                                    }
                                  : s,
                              ),
                            });
                          }
                        }}
                      />
                    ) : null}
                  </g>
                </g>
              );
            })}
          </g>
          {strokes.map((s, i) => (
            <polyline
              key={i}
              points={s.points}
              fill="none"
              stroke={s.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ))}
        </svg>
      </div>
      {scene.simulation ? (
        <ExperimentControls
          settings={scene.simulation}
          lang={lang}
          time={timeline.time}
          running={timeline.running}
          onToggle={timeline.toggle}
          onReset={timeline.reset}
          onChange={(simulation) => onChange({ ...scene, simulation })}
        />
      ) : null}
      <div className="board-toolbar">
        <div className="tool-group">
          <button
            className={mode === "select" ? "active" : ""}
            onClick={() => setMode("select")}
            aria-pressed={mode === "select"}
            aria-label={t("Explorer", "استكشاف")}
          >
            <MousePointer2 size={18} />
            <span>{t("Explorer", "استكشاف")}</span>
          </button>
          <button
            className={mode === "draw" ? "active" : ""}
            onClick={() => setMode("draw")}
            aria-pressed={mode === "draw"}
            aria-label={t("Dessiner", "رسم")}
          >
            <Pencil size={18} />
            <span>{t("Dessiner", "رسم")}</span>
          </button>
          <button
            disabled={!strokes.length}
            onClick={() => onStrokes(strokes.slice(0, -1))}
            aria-label={t("Annuler le dernier trait", "إلغاء آخر خط")}
          >
            <Undo2 size={18} />
          </button>
        </div>
        <button
          className="ask-drawing"
          disabled={busy || capturing}
          onClick={askDrawing}
        >
          <Send size={16} />
          {strokes.length
            ? t("Expliquer mon dessin", "اشرح رسمي")
            : t("Parler du tableau", "تحدث عن اللوحة")}
        </button>
      </div>
      {insight ? (
        <div className="selection-panel">
          <p>{insight}</p>
          <div>
            <button
              disabled={busy}
              onClick={() =>
                onAsk(
                  t(
                    "Explique-moi ce que j’ai sélectionné sur le tableau.",
                    "اشرح لي ما حدّدته على اللوحة.",
                  ),
                  undefined,
                  insight,
                )
              }
            >
              {t("Pourquoi, Milo ?", "لماذا يا ميلو؟")}
            </button>
            {selectedShape &&
            selectedShape.kind !== "text" &&
            selectedShape.kind !== "sticker" ? (
              <button
                onClick={() =>
                  onChange({
                    ...scene,
                    shapes: scene.shapes.map((s) =>
                      s.id === selected
                        ? {
                            ...s,
                            fill: s.fill === "#ffaf6c" ? "#a5c9b0" : "#ffaf6c",
                          }
                        : s,
                    ),
                  })
                }
              >
                <Paintbrush size={16} />
                {t("Colorier", "تلوين")}
              </button>
            ) : null}
            <button
              onClick={() => {
                setInsight("");
                setSelected(null);
              }}
              aria-label={t("Fermer", "إغلاق")}
            >
              <X size={17} />
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
});
