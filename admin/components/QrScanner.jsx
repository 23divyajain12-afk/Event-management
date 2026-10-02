"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const QrCodeScanner = ({ onScan }) => {
  const scannerRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const cooldownRef = useRef(false);
  const lastScannedRef = useRef(null);

  useEffect(() => {
    const initializeScanner = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Your browser does not support camera access.");
          return;
        }
        await navigator.mediaDevices.getUserMedia({ video: true });
        scannerRef.current = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        const debouncedScan = debounce((decodedText) => {
          if (decodedText !== lastScannedRef.current && !cooldownRef.current) {
            lastScannedRef.current = decodedText;
            cooldownRef.current = true;
            onScan(decodedText);

            // Reset cooldown after 3 seconds
            setTimeout(() => {
              cooldownRef.current = false;
              lastScannedRef.current = null;
            }, 3000);
          }
        }, 300);

        // Start with back camera (environment facing mode)
        scannerRef.current.start(
          { facingMode: "environment" },
          config,
          debouncedScan
        ).catch((err) => {
          console.warn("Environment camera failed, trying first available:", err);
          // Fallback to first available camera if environment fails
          navigator.mediaDevices.enumerateDevices().then((devices) => {
            const videoDevices = devices.filter(
              (device) => device.kind === "videoinput"
            );
            if (videoDevices.length > 0) {
              scannerRef.current.start(
                { deviceId: videoDevices[0].deviceId },
                config,
                debouncedScan
              );
            }
          });
        });

        console.log("QR scanner started successfully");
      } catch (err) {
        console.error("Failed to initialize scanner:", err);
        setCameraError(err.message || "Could not access the camera.");
      }
    };

    initializeScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => console.log("Scanner stopped"))
          .catch((err) => console.error("Failed to stop scanner", err));
      }
    };
  }, [onScan]);

  return (
    <div>
      {cameraError && <p>Error: {cameraError}</p>}
      <div id="reader"></div>
    </div>
  );
};

export default QrCodeScanner;
