"use client";
import { useId } from "react";
export function FoxAvatar({
  speaking = false,
  happy = false,
}: {
  speaking?: boolean;
  happy?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <div
      className={`fox-avatar avatar-float ${speaking ? "speaking" : ""} ${happy ? "happy" : ""}`}
    >
      <svg
        viewBox="0 0 280 280"
        role="img"
        aria-label="Milo, un petit renard souriant"
      >
        <defs>
          <linearGradient id={id} x2="0.8" y2="1">
            <stop stopColor="#ffa553" />
            <stop offset="1" stopColor="#ed692c" />
          </linearGradient>
        </defs>
        <ellipse
          cx="144"
          cy="252"
          rx="77"
          ry="10"
          fill="#d86a2d"
          opacity=".13"
        />
        <g className="fox-tail">
          <path
            d="M174 205Q255 232 246 153Q222 159 204 192Z"
            fill={`url(#${id})`}
          />
          <path d="M246 153Q249 184 235 204L216 184Z" fill="#fff4dd" />
        </g>
        <path
          d="M96 179Q79 211 99 244L179 244Q199 213 178 176"
          fill={`url(#${id})`}
        />
        <ellipse cx="140" cy="212" rx="29" ry="31" fill="#fff3df" />
        <path
          d="M91 208Q55 221 68 198L89 179M184 181Q208 179 213 153"
          fill="none"
          stroke="#f5843c"
          strokeWidth="19"
          strokeLinecap="round"
          className="fox-wave"
        />
        <path
          d="M70 90L68 24Q104 30 119 68M163 65Q192 29 218 24L211 105"
          fill="#f98a42"
          stroke="#e77432"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M80 48L84 94L107 76M183 76L204 47L199 95" fill="#5c3541" />
        <path
          d="M62 109Q65 62 139 61Q219 64 222 117L236 137L219 141Q205 188 140 194Q73 190 58 144L46 137Z"
          fill={`url(#${id})`}
        />
        <path
          d="M63 131Q93 104 137 151Q178 106 217 132Q203 183 140 188Q82 185 63 131"
          fill="#fff5e7"
        />
        <g className="avatar-eyes" fill="#343e34">
          <ellipse cx="100" cy="123" rx="7" ry="10" />
          <ellipse cx="180" cy="123" rx="7" ry="10" />
        </g>
        <circle cx="98" cy="119" r="2.5" fill="white" />
        <circle cx="178" cy="119" r="2.5" fill="white" />
        <ellipse cx="82" cy="143" rx="13" ry="7" fill="#f49d93" opacity=".7" />
        <ellipse cx="198" cy="143" rx="13" ry="7" fill="#f49d93" opacity=".7" />
        <path d="M130 150Q140 143 150 150Q142 164 137 160Z" fill="#343e34" />
        <path
          d="M130 167Q140 177 151 165"
          fill="none"
          stroke="#343e34"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="avatar-mouth"
        />
        <path
          d="M103 189Q140 203 177 187L173 204Q139 214 106 205Z"
          fill="#42644f"
        />
        <path d="M168 201L174 228L154 221L153 205" fill="#42644f" />
        <path
          d="M99 241L123 241M157 241L181 241"
          stroke="#d56429"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
export function AlexandreAvatar({ speaking = false }: { speaking?: boolean }) {
  return (
    <div
      className={`alexandre-avatar avatar-float ${speaking ? "speaking" : ""}`}
    >
      <span
        className="avatar-blink"
        role="img"
        aria-label="Alexandre, souriant et clignant des yeux"
      >
        <img src="/alexandre-avatar-open.png" alt="" draggable={false} />
        <img
          src="/alexandre-avatar-closed.png"
          alt=""
          className="avatar-blink-closed"
          draggable={false}
        />
      </span>
    </div>
  );
}
