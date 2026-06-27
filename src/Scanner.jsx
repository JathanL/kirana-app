import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

function Scanner({ onScan }) {
  const scannerRef = useRef(null);
  const isRunning = useRef(false);

  const playBeep = () => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(900, context.currentTime);
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.1);
  };

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        playBeep();
        onScan(decodedText);
      },
      (error) => {}
    ).then(() => {
      isRunning.current = true;
    }).catch((err) => {
      console.log("Camera start error:", err);
    });

    return () => {
      if (isRunning.current) {
        scanner.stop().then(() => {
          scanner.clear();
          isRunning.current = false;
        }).catch(() => {});
      }
    };
  }, []);

  return (
    <div style={{ marginBottom: "16px" }}>
      <div id="reader" style={{ width: "100%", borderRadius: "10px", overflow: "hidden" }}></div>
      <p style={{ textAlign: "center", fontSize: "12px", color: "#888", marginTop: "8px" }}>
        Point camera at a barcode to scan
      </p>
    </div>
  );
}

export default Scanner;