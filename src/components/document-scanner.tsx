'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Scan, Upload, FileText, AlertCircle, Check, RefreshCw, Loader2, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getRunAnywhereVision, type OCRResult } from '@/lib/run-anywhere';

interface DocumentScannerProps {
  onScanComplete?: (imageData: string, ocrResult?: OCRResult) => void;
  className?: string;
}

export function DocumentScanner({ onScanComplete, className }: DocumentScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const vision = getRunAnywhereVision();

  // Load vision model on mount
  useEffect(() => {
    const loadModel = async () => {
      const loaded = await vision.loadModel(setModelProgress);
      setModelLoaded(loaded);
    };
    loadModel();
  }, [vision]);

  // Request camera permission and start camera
  const startCamera = useCallback(async () => {
    setError(null);
    setIsScanning(true);
    
    try {
      const mediaStream = await vision.requestCamera();
      
      if (mediaStream) {
        setHasPermission(true);
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      } else {
        setHasPermission(false);
        setError('Camera access denied. Please allow camera access to scan documents.');
      }
    } catch (err) {
      setHasPermission(false);
      setError('Failed to access camera. Please check permissions.');
    }
  }, [vision]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  }, [stream]);

  // Process image with OCR
  const processWithOCR = useCallback(async (imageData: string) => {
    setIsProcessingOCR(true);
    setOcrProgress(0);
    
    try {
      const result = await vision.extractText(imageData);
      setOcrResult(result);
      setOcrProgress(100);
      
      if (onScanComplete) {
        onScanComplete(imageData, result);
      }
    } catch (error) {
      console.error('OCR processing failed:', error);
      setOcrResult({
        text: '',
        confidence: 0,
        words: [],
        lines: [],
      });
    } finally {
      setIsProcessingOCR(false);
    }
  }, [vision, onScanComplete]);

  // Capture image from video
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/png');
    setScannedImage(imageData);
    
    stopCamera();
    
    // Process with OCR
    await processWithOCR(imageData);
  }, [stopCamera, processWithOCR]);

  // Reset scanner
  const resetScanner = useCallback(() => {
    setScannedImage(null);
    setError(null);
    setHasPermission(null);
    setOcrResult(null);
    setOcrProgress(0);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setScannedImage(imageData);
      
      // Process with OCR
      await processWithOCR(imageData);
    };
    reader.readAsDataURL(file);
  }, [processWithOCR]);

  // Copy text to clipboard
  const copyText = useCallback(() => {
    if (ocrResult?.text) {
      navigator.clipboard.writeText(ocrResult.text);
    }
  }, [ocrResult?.text]);

  // Download as text file
  const downloadText = useCallback(() => {
    if (!ocrResult?.text) return;
    
    const blob = new Blob([ocrResult.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scan-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [ocrResult?.text]);

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Scan className="w-5 h-5 text-purple-500" />
          Document Scanner
          <Badge variant="outline" className="bg-purple-950 border-purple-700 text-purple-400 ml-auto">
            Vision AI + OCR
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Loading */}
        {!modelLoaded && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading OCR Engine (Tesseract.js)...
            </div>
            <Progress value={modelProgress} className="h-2" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Camera View */}
        <AnimatePresence>
          {isScanning && !scannedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg bg-zinc-800"
                style={{ aspectRatio: '4/3' }}
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-purple-500 rounded-lg pointer-events-none">
                <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-purple-500" />
                <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-purple-500" />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-purple-500" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-purple-500" />
              </div>
              
              {/* Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-zinc-900/80 border-zinc-700 text-white"
                  onClick={stopCamera}
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={captureImage}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Capture & OCR
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanned Image Preview with OCR Results */}
        {scannedImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={scannedImage}
                alt="Scanned document"
                className="w-full"
              />
              <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            </div>

            {/* OCR Processing */}
            {isProcessingOCR && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing with OCR...
                </div>
                <Progress value={ocrProgress} className="h-2" />
              </div>
            )}

            {/* OCR Results */}
            {ocrResult && ocrResult.text && !isProcessingOCR && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Extracted Text
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      ocrResult.confidence > 80 
                        ? "bg-green-950 border-green-700 text-green-400" 
                        : ocrResult.confidence > 50 
                          ? "bg-amber-950 border-amber-700 text-amber-400"
                          : "bg-red-950 border-red-700 text-red-400"
                    )}
                  >
                    {ocrResult.confidence.toFixed(0)}% confidence
                  </Badge>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-white text-sm whitespace-pre-wrap">{ocrResult.text}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-zinc-700 text-zinc-300"
                    onClick={copyText}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-zinc-700 text-zinc-300"
                    onClick={downloadText}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300"
                onClick={resetScanner}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Scan Again
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = scannedImage;
                  link.download = `scan-${Date.now()}.png`;
                  link.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Save Image
              </Button>
            </div>
          </motion.div>
        )}

        {/* Initial State - No camera active */}
        {!isScanning && !scannedImage && modelLoaded && (
          <div className="space-y-3">
            {/* Camera Button */}
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 h-16"
              onClick={startCamera}
            >
              <Camera className="w-6 h-6 mr-2" />
              Open Camera to Scan
            </Button>
            
            {/* Upload Button */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 h-12"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload from Gallery
              </Button>
            </div>
            
            {/* Info */}
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <FileText className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-zinc-400 text-xs">
                Scan ID cards, documents, or emergency information
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                🔒 Works 100% offline - images & text stay on your device
              </p>
              <p className="text-purple-400 text-xs mt-1">
                Powered by Tesseract.js OCR
              </p>
            </div>
          </div>
        )}

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Permission denied state */}
        {hasPermission === false && (
          <div className="bg-amber-950/50 border border-amber-800 rounded-lg p-4 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-400 text-sm font-medium">Camera Access Required</p>
            <p className="text-amber-400/70 text-xs mt-1">
              Please enable camera access in your browser settings to use the document scanner.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Vision AI Status Component
export function VisionAIStatus() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  
  const vision = getRunAnywhereVision();
  
  useEffect(() => {
    setIsSupported(vision.isSupported());
  }, [vision]);

  return (
    <div className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3">
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center',
        isSupported ? 'bg-green-600' : 'bg-zinc-700'
      )}>
        <Scan className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-white font-medium text-sm">Vision AI + OCR</p>
        <p className="text-zinc-400 text-xs">
          {isSupported ? '✅ Camera & OCR supported' : '❌ Camera not available'}
        </p>
      </div>
    </div>
  );
}
