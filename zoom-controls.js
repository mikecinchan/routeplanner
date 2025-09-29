class MapZoomController {
    constructor() {
        this.currentZoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 5;
        this.zoomStep = 0.25;

        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.translateX = 0;
        this.translateY = 0;

        this.isFullscreen = false;

        this.mapWrapper = null;
        this.mapContent = null;

        this.init();
    }

    init() {
        // Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', () => {
            this.mapWrapper = document.getElementById('map-wrapper');
            this.mapContent = document.getElementById('map-content');

            if (this.mapWrapper && this.mapContent) {
                this.setupEventListeners();
                this.updateTransform();
            }
        });
    }

    setupEventListeners() {
        // Zoom controls
        document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-reset')?.addEventListener('click', () => this.resetZoom());
        document.getElementById('fullscreen-toggle')?.addEventListener('click', () => this.toggleFullscreen());

        // Mouse events for desktop
        this.mapWrapper.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.mapWrapper.addEventListener('mousedown', (e) => this.startPan(e));
        this.mapWrapper.addEventListener('mousemove', (e) => this.doPan(e));
        this.mapWrapper.addEventListener('mouseup', () => this.endPan());
        this.mapWrapper.addEventListener('mouseleave', () => this.endPan());

        // Double-click to zoom
        this.mapWrapper.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

        // Touch events for mobile
        this.mapWrapper.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.mapWrapper.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.mapWrapper.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Prevent context menu on map
        this.mapWrapper.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    zoomIn() {
        this.setZoom(Math.min(this.currentZoom + this.zoomStep, this.maxZoom));
    }

    zoomOut() {
        this.setZoom(Math.max(this.currentZoom - this.zoomStep, this.minZoom));
    }

    resetZoom() {
        this.currentZoom = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.updateTransform();
    }

    setZoom(newZoom, centerX = null, centerY = null) {
        const oldZoom = this.currentZoom;
        this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        // If zoom point is specified, adjust translation to zoom towards that point
        if (centerX !== null && centerY !== null) {
            const rect = this.mapWrapper.getBoundingClientRect();
            const offsetX = centerX - rect.left - rect.width / 2;
            const offsetY = centerY - rect.top - rect.height / 2;

            const scale = this.currentZoom / oldZoom;
            this.translateX = this.translateX * scale - offsetX * (scale - 1);
            this.translateY = this.translateY * scale - offsetY * (scale - 1);
        }

        this.constrainPan();
        this.updateTransform();
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = -e.deltaY * 0.01;
        const newZoom = this.currentZoom + delta * this.zoomStep;
        this.setZoom(newZoom, e.clientX, e.clientY);
    }

    handleDoubleClick(e) {
        e.preventDefault();
        if (this.currentZoom >= 2) {
            this.resetZoom();
        } else {
            this.setZoom(2, e.clientX, e.clientY);
        }
    }

    startPan(e) {
        if (e.button !== 0) return; // Only left mouse button
        this.isPanning = true;
        this.startX = e.clientX - this.translateX;
        this.startY = e.clientY - this.translateY;
        this.mapWrapper.classList.add('dragging');
        e.preventDefault();
    }

    doPan(e) {
        if (!this.isPanning) return;
        this.translateX = e.clientX - this.startX;
        this.translateY = e.clientY - this.startY;
        this.constrainPan();
        this.updateTransform();
    }

    endPan() {
        this.isPanning = false;
        this.mapWrapper.classList.remove('dragging');
    }

    // Touch handling for mobile pinch-to-zoom and pan
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // Single touch - start panning
            const touch = e.touches[0];
            this.isPanning = true;
            this.startX = touch.clientX - this.translateX;
            this.startY = touch.clientY - this.translateY;
        } else if (e.touches.length === 2) {
            // Two fingers - prepare for pinch zoom
            this.isPanning = false;
            this.lastPinchDistance = this.getPinchDistance(e.touches);
            this.lastPinchCenter = this.getPinchCenter(e.touches);
        }
        e.preventDefault();
    }

    handleTouchMove(e) {
        if (e.touches.length === 1 && this.isPanning) {
            // Single touch - pan
            const touch = e.touches[0];
            this.translateX = touch.clientX - this.startX;
            this.translateY = touch.clientY - this.startY;
            this.constrainPan();
            this.updateTransform();
        } else if (e.touches.length === 2) {
            // Two fingers - pinch zoom
            const currentDistance = this.getPinchDistance(e.touches);
            const currentCenter = this.getPinchCenter(e.touches);

            if (this.lastPinchDistance) {
                const scale = currentDistance / this.lastPinchDistance;
                const newZoom = this.currentZoom * scale;
                this.setZoom(newZoom, currentCenter.x, currentCenter.y);
            }

            this.lastPinchDistance = currentDistance;
            this.lastPinchCenter = currentCenter;
        }
        e.preventDefault();
    }

    handleTouchEnd(e) {
        if (e.touches.length === 0) {
            this.isPanning = false;
            this.lastPinchDistance = null;
            this.lastPinchCenter = null;
        } else if (e.touches.length === 1) {
            // Back to single touch
            const touch = e.touches[0];
            this.isPanning = true;
            this.startX = touch.clientX - this.translateX;
            this.startY = touch.clientY - this.translateY;
            this.lastPinchDistance = null;
        }
    }

    getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getPinchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    constrainPan() {
        if (this.currentZoom <= 1) {
            this.translateX = 0;
            this.translateY = 0;
            return;
        }

        const rect = this.mapWrapper.getBoundingClientRect();
        const contentWidth = rect.width * this.currentZoom;
        const contentHeight = rect.height * this.currentZoom;

        const maxTranslateX = (contentWidth - rect.width) / 2;
        const maxTranslateY = (contentHeight - rect.height) / 2;

        this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
        this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));
    }

    updateTransform() {
        if (!this.mapContent) return;

        const transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentZoom})`;
        this.mapContent.style.transform = transform;

        // Update zoom control states
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');

        if (zoomInBtn) zoomInBtn.disabled = this.currentZoom >= this.maxZoom;
        if (zoomOutBtn) zoomOutBtn.disabled = this.currentZoom <= this.minZoom;
    }

    toggleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
        const mapContainer = document.querySelector('.mrt-map-container');

        if (this.isFullscreen) {
            mapContainer.classList.add('fullscreen-map');
            document.getElementById('fullscreen-toggle').textContent = '🗙';
            document.getElementById('fullscreen-toggle').title = 'Exit Fullscreen';
        } else {
            mapContainer.classList.remove('fullscreen-map');
            document.getElementById('fullscreen-toggle').textContent = '⛶';
            document.getElementById('fullscreen-toggle').title = 'Toggle Fullscreen';
        }

        // Reset zoom when toggling fullscreen
        setTimeout(() => this.resetZoom(), 100);
    }

    handleKeyboard(e) {
        if (!this.mapWrapper) return;

        // Only handle keyboard if map container is focused or mouse is over it
        const rect = this.mapWrapper.getBoundingClientRect();
        const mouseX = window.lastMouseX || 0;
        const mouseY = window.lastMouseY || 0;
        const isOverMap = mouseX >= rect.left && mouseX <= rect.right &&
                         mouseY >= rect.top && mouseY <= rect.bottom;

        if (!isOverMap) return;

        switch(e.key) {
            case '+':
            case '=':
                e.preventDefault();
                this.zoomIn();
                break;
            case '-':
                e.preventDefault();
                this.zoomOut();
                break;
            case '0':
                e.preventDefault();
                this.resetZoom();
                break;
            case 'f':
            case 'F':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.toggleFullscreen();
                }
                break;
            case 'Escape':
                if (this.isFullscreen) {
                    this.toggleFullscreen();
                }
                break;
        }
    }
}

// Track mouse position for keyboard shortcuts
document.addEventListener('mousemove', (e) => {
    window.lastMouseX = e.clientX;
    window.lastMouseY = e.clientY;
});

// Initialize the zoom controller
window.mapZoomController = new MapZoomController();