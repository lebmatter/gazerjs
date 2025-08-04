class FaceDetector extends EventTarget {
    constructor() {
        super();
        this.faceDetection = null;
        this.camera = null;
        this.canvas = null;
        this.ctx = null;
        this.debugMode = false;
        this.isInitialized = false;
        this.animationId = null;
    }

    async init(cameraDiv, options = {}) {
        try {
            this.debugMode = options.debug || false;
            
            if (!cameraDiv) {
                throw new Error('Camera div element is required');
            }

            // Initialize MediaPipe Face Detection
            const { FaceDetector, FilesetResolver } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3');
            
            // Initialize the wasm fileset
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
            );
            
            this.faceDetection = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
                    delegate: "GPU"
                },
                runningMode: "VIDEO"
            });

            // Setup camera
            await this.setupCamera(cameraDiv);
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('initialized'));
            
            // Start detection loop
            this.startDetection();
            
        } catch (error) {
            this.dispatchEvent(new CustomEvent('error', { 
                detail: { type: 'initialization', message: error.message } 
            }));
        }
    }

    async setupCamera(cameraDiv) {
        // Create video element
        this.camera = document.createElement('video');
        this.camera.setAttribute('playsinline', '');
        this.camera.style.width = '100%';
        this.camera.style.height = '100%';
        this.camera.style.objectFit = 'cover';
        
        // Create canvas for debug mode
        if (this.debugMode) {
            this.canvas = document.createElement('canvas');
            this.canvas.style.position = 'absolute';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.pointerEvents = 'none';
            this.ctx = this.canvas.getContext('2d');
        }

        // Setup camera div styling
        cameraDiv.style.position = 'relative';
        cameraDiv.style.overflow = 'hidden';
        
        // Add elements to DOM
        cameraDiv.appendChild(this.camera);
        if (this.canvas) {
            cameraDiv.appendChild(this.canvas);
        }

        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        });

        this.camera.srcObject = stream;
        
        return new Promise((resolve) => {
            this.camera.onloadedmetadata = () => {
                this.camera.play();
                
                // Set canvas dimensions to match video
                if (this.canvas) {
                    this.canvas.width = this.camera.videoWidth;
                    this.canvas.height = this.camera.videoHeight;
                }
                
                resolve();
            };
        });
    }

    startDetection() {
        if (!this.isInitialized || !this.camera) return;

        const detect = () => {
            if (this.camera.readyState === 4) {
                const startTimeMs = performance.now();
                const detections = this.faceDetection.detectForVideo(this.camera, startTimeMs);
                
                this.processDetections(detections);
            }
            
            this.animationId = requestAnimationFrame(detect);
        };

        detect();
    }

    processDetections(detections) {
        const faceCount = detections.detections.length;
        
        // Clear previous debug drawings
        if (this.debugMode && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Check person count and emit events
        if (faceCount === 0) {
            this.dispatchEvent(new CustomEvent('noPerson', {
                detail: { count: faceCount, message: 'No person detected on screen' }
            }));
        } else if (faceCount > 1) {
            this.dispatchEvent(new CustomEvent('multiplePeople', {
                detail: { count: faceCount, message: `${faceCount} people detected. Only 1 person should be on screen` }
            }));
        } else {
            // Exactly 1 person - this is good
            this.dispatchEvent(new CustomEvent('singlePerson', {
                detail: { count: faceCount, detection: detections.detections[0] }
            }));
        }

        // Draw debug rectangles if debug mode is enabled
        if (this.debugMode && this.ctx && faceCount > 0) {
            this.drawFaceRectangles(detections.detections);
        }

        // Always emit detection event with raw data
        this.dispatchEvent(new CustomEvent('detection', {
            detail: { detections: detections.detections, count: faceCount }
        }));
    }

    drawFaceRectangles(detections) {
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 3;
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#00FF00';

        detections.forEach((detection, index) => {
            const bbox = detection.boundingBox;
            
            // Convert normalized coordinates to canvas coordinates
            const x = bbox.originX * this.canvas.width;
            const y = bbox.originY * this.canvas.height;
            const width = bbox.width * this.canvas.width;
            const height = bbox.height * this.canvas.height;

            // Draw rectangle
            this.ctx.strokeRect(x, y, width, height);
            
            // Draw label
            const confidence = (detection.categories[0]?.score * 100).toFixed(1);
            this.ctx.fillText(`Face ${index + 1} (${confidence}%)`, x, y - 5);
        });
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.camera && this.camera.srcObject) {
            const tracks = this.camera.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }

        this.isInitialized = false;
        this.dispatchEvent(new CustomEvent('stopped'));
    }

    destroy() {
        this.stop();
        
        if (this.camera) {
            this.camera.remove();
        }
        
        if (this.canvas) {
            this.canvas.remove();
        }

        this.faceDetection = null;
        this.camera = null;
        this.canvas = null;
        this.ctx = null;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceDetector;
} else if (typeof window !== 'undefined') {
    window.FaceDetector = FaceDetector;
}