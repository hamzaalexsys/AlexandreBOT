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
      <svg
        viewBox="0 0 280 280"
        role="img"
        aria-label="Alexandre, souriant, en djellaba et casquette"
      >
        <ellipse
          cx="140"
          cy="257"
          rx="73"
          ry="9"
          fill="#355846"
          opacity=".12"
        />
        <path
          d="M103 155Q57 172 61 248L220 248Q217 179 177 157L159 145Z"
          fill="#50705b"
        />
        <path d="M105 158L139 195L178 157L163 244L114 244Z" fill="#dcd3b6" />
        <path d="M129 171L140 193L151 171L147 253L135 253Z" fill="#f5ecda" />
        <path
          d="M96 176L85 241M183 176L197 239"
          stroke="#36503f"
          strokeWidth="4"
          fill="none"
        />
        <path
          d="M131 200H151M132 218H150M133 236H148"
          stroke="#ae986e"
          strokeWidth="3"
        />
        <path d="M118 138L117 160Q140 178 164 157L162 136" fill="#dca77a" />
        <ellipse cx="91" cy="109" rx="10" ry="17" fill="#e6b58c" />
        <ellipse cx="190" cy="109" rx="10" ry="17" fill="#e6b58c" />
        <path
          d="M93 66Q140 38 189 69L185 123Q181 157 142 165Q98 156 94 124Z"
          fill="#efc49c"
        />
        <path
          d="M95 100L96 70L109 71L101 103M181 77L188 76L187 105"
          fill="#465044"
        />
        <path
          d="M103 97Q114 90 126 96M155 95Q169 88 178 96"
          stroke="#4c4b3e"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <g className="avatar-eyes" fill="#384439">
          <ellipse cx="115" cy="108" rx="4.5" ry="6" />
          <ellipse cx="166" cy="108" rx="4.5" ry="6" />
        </g>
        <path
          d="M139 109L134 126L144 127"
          fill="none"
          stroke="#d39e75"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M122 138Q140 153 159 136"
          fill="#fff9ee"
          stroke="#aa7059"
          strokeWidth="2"
          strokeLinejoin="round"
          className="avatar-mouth"
        />
        <path d="M89 75Q87 30 132 27Q184 22 192 65L199 78Z" fill="#365843" />
        <path
          d="M84 73Q143 61 204 73Q191 90 165 81Q126 77 84 85Z"
          fill="#233e2f"
        />
        <path d="M138 34L141 60" stroke="#718774" strokeWidth="2" />
        <circle cx="109" cy="129" r="9" fill="#e5a382" opacity=".4" />
        <circle cx="174" cy="129" r="9" fill="#e5a382" opacity=".4" />
        <path
          d="M79 223Q59 222 63 202Q67 194 78 202L86 213M204 219Q225 209 218 194Q209 189 200 204"
          fill="#efc49c"
        />
      </svg>
    </div>
  );
}
