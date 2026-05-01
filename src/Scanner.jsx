import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

function Scanner({ onScan }) {
  const scannerRef = useRef(null);
  const isRunning = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
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