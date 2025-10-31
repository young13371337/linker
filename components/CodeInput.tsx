import React, { useRef, useEffect } from "react";

type CodeInputProps = {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (val: string) => void;
  size?: "small" | "large";
};

export default function CodeInput({ value, onChange, length = 6, disabled = false, autoFocus = false, onComplete, size = "large" }: CodeInputProps) {
  // Animation style (smaller small-size for neater look)
  const baseSize = size === "small" ? 28 : size === "large" ? 48 : 28;
  const baseHeight = size === "small" ? 36 : size === "large" ? 56 : 36;
  const baseFont = size === "small" ? 20 : size === "large" ? 32 : 20;
  const baseRadius = size === "small" ? 7 : size === "large" ? 12 : 7;
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 1);
    let newValueArr = value.split("");
    newValueArr[idx] = val;
    const newValue = newValueArr.join("");
    onChange(newValue);
    if (val && idx < (length - 1)) {
      const nextInput = inputsRef.current[idx + 1];
      if (nextInput) nextInput.focus();
    }
    if (newValue.length === length && onComplete) {
      onComplete(newValue);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      if (value[idx]) {
        // Erase current digit
        let newValueArr = value.split("");
        newValueArr[idx] = "";
        onChange(newValueArr.join(""));
      } else if (idx > 0) {
        // Move focus and erase previous
        const prevInput = inputsRef.current[idx - 1];
        if (prevInput) prevInput.focus();
        let newValueArr = value.split("");
        newValueArr[idx - 1] = "";
        onChange(newValueArr.join(""));
      }
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      const prevInput = inputsRef.current[idx - 1];
      if (prevInput) prevInput.focus();
    }
    if (e.key === "ArrowRight" && idx < length - 1) {
      const nextInput = inputsRef.current[idx + 1];
      if (nextInput) nextInput.focus();
    }
    if (e.key === "Enter" && value.length === length && onComplete) {
      onComplete(value);
    }
  };
  return (
    <>
      <style>{`
        .code-cell-input {
          transition: border 0.22s, box-shadow 0.22s, transform 0.22s;
        }
        .code-cell-input:focus {
          border-color: #4fc3f7 !important;
          box-shadow: 0 2px 16px #4fc3f7a0 !important;
          transform: scale(1.08);
        }
        .code-cell-char {
          display: block;
          transition: opacity 0.22s, transform 0.22s;
          opacity: 1;
          transform: scale(1);
        }
        .code-cell-char.hide {
          opacity: 0;
          transform: scale(0.7);
        }
      `}</style>
      <div style={{ display: "flex", gap: Math.max(6, Math.floor(baseSize / 6)), justifyContent: "center", margin: Math.max(6, Math.floor(baseHeight / 4)) + "px 0" }}>
        {Array.from({ length }).map((_, idx) => (
          <div key={idx} style={{ position: "relative" }}>
            <input
              className="code-cell-input"
              ref={el => { inputsRef.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={""}
              onChange={e => handleChange(e, idx)}
              onKeyDown={e => handleKeyDown(e, idx)}
              disabled={disabled}
              style={{
                width: baseSize,
                height: baseHeight,
                fontSize: baseFont,
                textAlign: "center",
                borderRadius: baseRadius,
                border: "1.6px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
                color: "#fff",
                fontWeight: 700,
                boxShadow: "none",
                outline: "none",
                transition: "border 0.18s, box-shadow 0.18s, transform 0.18s"
              }}
              onFocus={e => e.target.select()}
              autoComplete="off"
            />
            <span
              className={"code-cell-char" + (value[idx] ? "" : " hide")}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: baseSize,
                height: baseHeight,
                lineHeight: baseHeight + "px",
                fontSize: baseFont,
                textAlign: "center",
                color: "#fff",
                pointerEvents: "none",
                fontWeight: 700,
                userSelect: "none",
                transition: "opacity 0.22s, transform 0.22s"
              }}
            >{value[idx] ? "*" : ""}</span>
          </div>
        ))}
      </div>
    </>
  );
}