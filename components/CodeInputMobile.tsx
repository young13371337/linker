import React, { useRef, useEffect, useState } from "react";

type CodeInputProps = {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (val: string) => void;
  size?: "small" | "large";
};

export default function CodeInputMobile({ value, onChange, length = 6, disabled = false, autoFocus = false, onComplete, size = "large" }: CodeInputProps) {
  // Responsive: switch to compact sizes on small screens automatically.
  const [effectiveSize, setEffectiveSize] = useState<typeof size>(size);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(max-width: 420px)") : null;
    const handle = (ev?: MediaQueryListEvent) => {
      const isSmall = mq ? (mq.matches || (ev && ev.matches) ? true : false) : false;
      setEffectiveSize(isSmall ? "small" : size);
    };
    if (mq) {
      handle();
      if ((mq as any).addEventListener) {
        (mq as any).addEventListener("change", handle);
      } else {
        (mq as any).addListener(handle);
      }
      return () => {
        if ((mq as any).removeEventListener) {
          (mq as any).removeEventListener("change", handle);
        } else {
          (mq as any).removeListener(handle);
        }
      };
    } else {
      setEffectiveSize(size);
    }
  }, [size]);

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  // Animation style based on effectiveSize (tighter/smaller for a neater look)
  const baseSize = effectiveSize === "small" ? 24 : 44;
  const baseHeight = effectiveSize === "small" ? 32 : 52;
  const baseFont = effectiveSize === "small" ? 16 : 30;
  const baseRadius = effectiveSize === "small" ? 6 : 10;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 1);
    let newValueArr = value.split("");
    while (newValueArr.length < length) newValueArr.push("");
    newValueArr[idx] = val;
    const newValue = newValueArr.join("").slice(0, length);
    onChange(newValue);
    if (val && idx < length - 1) {
      const nextInput = inputsRef.current[idx + 1];
      if (nextInput) nextInput.focus();
    }
    if (newValue.replace(/\s/g, "").length === length && onComplete) {
      onComplete(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      if (value[idx]) {
        let newValueArr = value.split("");
        newValueArr[idx] = "";
        onChange(newValueArr.join(""));
      } else if (idx > 0) {
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
    <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "0" }}>
      {Array.from({ length }).map((_, idx) => (
        <div key={idx} style={{ position: "relative" }}>
          <input
            ref={el => { inputsRef.current[idx] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={value[idx] || ""}
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
        </div>
      ))}
    </div>
  );
}
