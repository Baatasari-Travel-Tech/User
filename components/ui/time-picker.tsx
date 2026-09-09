"use client";

import React, { useState, useRef } from "react";

interface TimePickerProps {
    initialTime?: string; // Format "HH:MM AM/PM"
    onTimeChange: (time: string) => void;
    onClose: () => void;
}

const TimePicker: React.FC<TimePickerProps> = ({
    initialTime = "07:00 AM",
    onTimeChange,
    onClose,
}) => {
    // Parse initial time
    const parseTime = (timeStr: string) => {
        const regex = /(\d{1,2}):(\d{2})\s?(AM|PM)/i;
        const match = timeStr.match(regex);
        if (match) {
            return {
                hour: parseInt(match[1]),
                minute: parseInt(match[2]),
                period: match[3].toUpperCase() as "AM" | "PM",
            };
        }
        return { hour: 7, minute: 0, period: "AM" as "AM" | "PM" };
    };

    const [timeState, setTimeState] = useState(parseTime(initialTime));
    const [view, setView] = useState<"hours" | "minutes">("hours");
    const clockRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    // Helper to get angle from mouse/touch position
    const getAngle = (clientX: number, clientY: number) => {
        if (!clockRef.current) return 0;
        const rect = clockRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const x = clientX - centerX;
        const y = clientY - centerY;
        // atan2 returns angle in radians from -PI to PI
        // -PI/2 is top (12 o'clock)
        let deg = (Math.atan2(y, x) * 180) / Math.PI;
        deg += 90; // Adjust so 0 is 12 o'clock
        if (deg < 0) deg += 360;
        return deg;
    };

    const handleClockInteraction = (
        e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
        isEnd = false
    ) => {
        // Prevent default to avoid scrolling on touch
        // e.preventDefault(); // Sometimes problematic with React synthetic events

        let clientX, clientY;
        if ("touches" in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ("changedTouches" in e) {
            // For touchend
            clientX = (e as unknown as React.TouchEvent).changedTouches[0].clientX;
            clientY = (e as unknown as React.TouchEvent).changedTouches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const deg = getAngle(clientX, clientY);

        if (view === "hours") {
            let hour = Math.round(deg / 30);
            if (hour === 0) hour = 12;
            setTimeState((prev) => ({ ...prev, hour }));
            if (isEnd) {
                setView("minutes");
            }
        } else {
            let minute = Math.round(deg / 6);
            if (minute === 60) minute = 0;
            setTimeState((prev) => ({ ...prev, minute }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        handleClockInteraction(e);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging.current) {
            handleClockInteraction(e);
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (isDragging.current) {
            isDragging.current = false;
            handleClockInteraction(e, true); // true = interaction ended
        }
    };

    // Styles
    const primaryColor = "var(--blue-900)"; // Dark blue
    const secondaryColor = "var(--blue-100)"; // Light blue
    const clockFaceColor = "var(--gray-200)"; // Gray clock face

    // Calculate hand rotation
    const handRotation =
        view === "hours" ? timeState.hour * 30 : timeState.minute * 6;

    // Render numbers
    const renderNumbers = () => {
        const numbers: React.JSX.Element[] = [];
        // Both views map to 12 positions visually generally, but minutes we might want all 60 or just 5s.
        // Standard android time picker shows 12 numbers for hours, and 12 numbers (5, 10, 15...) for minutes.

        for (let i = 1; i <= 12; i++) {
            const val = view === "hours" ? i : i * 5 === 60 ? 0 : i * 5;
            // Position calculation
            // 0 deg is 12 o'clock. 
            const angleDeg = i * 30;
            const angleRad = (angleDeg - 90) * (Math.PI / 180);
            const radius = 100; // Face radius approx 128px, num radius ~100
            const x = 128 + Math.cos(angleRad) * radius;
            const y = 128 + Math.sin(angleRad) * radius;

            // Correct comparison:
            let isMatch = false;
            if (view === "hours") {
                isMatch = timeState.hour === i;
            } else {
                const m = i === 12 ? 0 : i * 5;
                isMatch = timeState.minute === m;
            }

            numbers.push(
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        left: x,
                        top: y,
                        transform: "translate(-50%, -50%)",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        fontSize: "16px",
                        fontWeight: 500,
                        pointerEvents: "none", // Let clicks pass through to container
                        color: isMatch ? "white" : "var(--gray-700)",
                        zIndex: 2,
                    }}
                >
                    {view === "minutes" && val === 0 ? "00" : val}
                </div>
            );
        }
        return numbers;
    };

    const handleOk = () => {
        const h = timeState.hour.toString().padStart(2, "0");
        const m = timeState.minute.toString().padStart(2, "0");
        onTimeChange(`${h}:${m} ${timeState.period}`);
        onClose();
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    width: "320px",
                    backgroundColor: "var(--white)",
                    borderRadius: "28px",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "24px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                }}
            >
                <div style={{ fontSize: "14px", color: "var(--gray-500)", fontWeight: 500 }}>
                    Select time
                </div>

                {/* Digital Display */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px" }}>
                    <div
                        onClick={() => setView("hours")}
                        style={{
                            backgroundColor: view === "hours" ? secondaryColor : "var(--gray-100)",
                            padding: "8px 16px",
                            borderRadius: "12px",
                            fontSize: "30px",
                            lineHeight: "1",
                            color: view === "hours" ? primaryColor : "var(--gray-800)",
                            cursor: "pointer",
                            // Was 300. No family loaded here has a 300 face, so
                            // the browser was already falling back to 400 —
                            // this renders identically and stops implying a
                            // light weight that never existed.
                            fontWeight: 400,
                        }}
                    >
                        {timeState.hour.toString().padStart(2, "0")}
                    </div>
                    <div style={{ fontSize: "30px", lineHeight: "1", color: "var(--gray-800)", marginTop: "-8px" }}>:</div>
                    <div
                        onClick={() => setView("minutes")}
                        style={{
                            backgroundColor: view === "minutes" ? secondaryColor : "var(--gray-100)",
                            padding: "8px 16px",
                            borderRadius: "12px",
                            fontSize: "30px",
                            lineHeight: "1",
                            color: view === "minutes" ? primaryColor : "var(--gray-800)",
                            cursor: "pointer",
                            fontWeight: 400,
                        }}
                    >
                        {timeState.minute.toString().padStart(2, "0")}
                    </div>

                    {/* AM/PM Toggle */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            border: "1px solid var(--gray-300)",
                            borderRadius: "8px",
                            overflow: "hidden",
                        }}
                    >
                        <button
                            onClick={() => setTimeState((prev) => ({ ...prev, period: "AM" }))}
                            style={{
                                padding: "8px 12px",
                                backgroundColor: timeState.period === "AM" ? primaryColor : "white",
                                color: timeState.period === "AM" ? "white" : "var(--gray-700)",
                                fontSize: "14px",
                                fontWeight: 600,
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            AM
                        </button>
                        <div style={{ height: "1px", backgroundColor: "var(--gray-300)" }} />
                        <button
                            onClick={() => setTimeState((prev) => ({ ...prev, period: "PM" }))}
                            style={{
                                padding: "8px 12px",
                                backgroundColor: timeState.period === "PM" ? primaryColor : "white",
                                color: timeState.period === "PM" ? "white" : "var(--gray-700)",
                                fontSize: "14px",
                                fontWeight: 600,
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            PM
                        </button>
                    </div>
                </div>

                {/* Analog Clock Face */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <div
                        ref={clockRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        // Add touch support
                        onTouchStart={() => { isDragging.current = true; }}
                        onTouchMove={(e) => {
                            if (isDragging.current) handleClockInteraction(e);
                        }}
                        onTouchEnd={(e) => {
                            if (isDragging.current) {
                                isDragging.current = false;
                                handleClockInteraction(e, true);
                            }
                        }}
                        style={{
                            width: "256px",
                            height: "256px",
                            borderRadius: "50%",
                            backgroundColor: clockFaceColor,
                            position: "relative",
                            cursor: "pointer",
                            touchAction: "none" // Prevent scroll on mobile
                        }}
                    >
                        {/* Center Dot */}
                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                width: "8px",
                                height: "8px",
                                backgroundColor: primaryColor,
                                borderRadius: "50%",
                                transform: "translate(-50%, -50%)",
                                zIndex: 10,
                            }}
                        />

                        {/* Hand */}
                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                width: "2px",
                                height: "100px", // Hand length
                                backgroundColor: primaryColor,
                                transformOrigin: "bottom center",
                                transform: `translate(-50%, -100%) rotate(${handRotation}deg)`,
                                pointerEvents: "none",
                                zIndex: 1,
                            }}
                        >
                            {/* Circle at tip of hand */}
                            <div
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    backgroundColor: primaryColor,
                                    borderRadius: "50%",
                                    position: "absolute",
                                    top: "-20px", // Center on tip (height is 30, so half is 20) 
                                    // Wait, top of line (0,0 of line relative). Line is height 100.
                                    // rotate transform origin is bottom center.
                                    // top: 0 is the tip.
                                    left: "50%",
                                    transform: "translate(-50%, 0)",
                                    zIndex: -1
                                }}
                            ></div>
                        </div>

                        {renderNumbers()}
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            color: primaryColor,
                            fontSize: "14px",
                            fontWeight: 600,
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleOk}
                        style={{
                            padding: "8px 16px",
                            color: primaryColor,
                            fontSize: "14px",
                            fontWeight: 600,
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TimePicker;
