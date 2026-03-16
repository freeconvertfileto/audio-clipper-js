class AudioClipper {
    constructor() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadContainer = document.getElementById('uploadContainer');
        this.audioEditor = document.getElementById('audioEditor');
        this.waveformEl = document.getElementById('waveform');
        this.playBtn = document.getElementById('playBtn');
        this.playIcon = document.getElementById('playIcon');
        this.pauseIcon = document.getElementById('pauseIcon');
        this.loopBtn = document.getElementById('loopBtn');
        this.currentTimeDisplay = document.getElementById('currentTimeDisplay');
        this.totalDurationEl = document.getElementById('totalDuration');
        this.trimBtn = document.getElementById('trimBtn');
        this.trimStatus = document.getElementById('trimStatus');
        this.downloadWrap = document.getElementById('downloadWrap');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.outputFormat = document.getElementById('outputFormat');
        this.uploadNewBtn = document.getElementById('uploadNewBtn');

        this.timeline = document.getElementById('audioTimeline');
        this.handleStart = document.getElementById('audioHandleStart');
        this.handleEnd = document.getElementById('audioHandleEnd');
        this.trimRegion = document.getElementById('audioTrimRegion');
        this.dimLeft = document.getElementById('audioDimLeft');
        this.dimRight = document.getElementById('audioDimRight');
        this.playhead = document.getElementById('audioPlayhead');
        this.tooltipStart = document.getElementById('audioTooltipStart');
        this.tooltipEnd = document.getElementById('audioTooltipEnd');
        this.clipDuration = document.getElementById('audioDuration');

        this.wavesurfer = null;
        this.audioBuffer = null;
        this.rawArrayBuffer = null;
        this.sourceFileName = '';
        this.isLooping = false;
        this.isPlaying = false;
        this.duration = 0;
        this.startRatio = 0;
        this.endRatio = 1;
        this.isDraggingStart = false;
        this.isDraggingEnd = false;
        this.dragOffsetRatio = 0;

        this.acceptedFormats = {
            'mp3': true, 'mpeg': true, 'wav': true, 'ogg': true,
            'flac': true, 'aac': true, 'm4a': true
        };

        this.init();
    }

    init() {
        this.setupUploadListeners();
        this.setupEditorListeners();
        this.setupTimelineListeners();
    }

    // --- Upload ---

    setupUploadListeners() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.loadFile(e.target.files[0]);
            }
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
            this.uploadArea.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); });
        });
        ['dragenter', 'dragover'].forEach(ev => {
            this.uploadArea.addEventListener(ev, () => this.uploadArea.classList.add('drag-over'));
        });
        ['dragleave', 'drop'].forEach(ev => {
            this.uploadArea.addEventListener(ev, () => this.uploadArea.classList.remove('drag-over'));
        });
        this.uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) this.loadFile(files[0]);
        });
    }

    isValidAudioFile(file) {
        return this.acceptedFormats[file.name.split('.').pop().toLowerCase()] === true;
    }

    async loadFile(file) {
        if (!this.isValidAudioFile(file)) {
            alert('Please select a valid audio file (MP3, WAV, OGG, FLAC, AAC, M4A).');
            return;
        }

        this.sourceFileName = file.name.replace(/\.[^/.]+$/, '');

        const arrayBuffer = await file.arrayBuffer();
        this.rawArrayBuffer = arrayBuffer;

        const blob = new Blob([arrayBuffer], { type: file.type || 'audio/mpeg' });
        const objectUrl = URL.createObjectURL(blob);

        try {
            const ctx = new AudioContext();
            this.audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
            await ctx.close();
            this.duration = this.audioBuffer.duration;
        } catch (err) {
            alert('Could not decode audio file: ' + err.message);
            return;
        }

        this.uploadContainer.style.display = 'none';
        this.audioEditor.style.display = 'block';
        this.downloadWrap.style.display = 'none';
        this.trimStatus.style.display = 'none';

        if (this.wavesurfer) {
            this.wavesurfer.destroy();
            this.wavesurfer = null;
        }

        this.wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#555',
            progressColor: '#FFD60A',
            height: 140,
            normalize: true,
            interact: true,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            cursorColor: '#fff',
            cursorWidth: 2,
        });

        this.wavesurfer.load(objectUrl);

        this.wavesurfer.on('ready', () => {
            this.duration = this.wavesurfer.getDuration();
            this.startRatio = 0;
            this.endRatio = 1;
            var totalEl = document.getElementById('totalDuration');
            if (totalEl) totalEl.textContent = this.formatShort(this.duration);
            this.updateUI();
        });

        this.wavesurfer.on('audioprocess', () => {
            this.updatePlayhead();
            if (this.currentTimeDisplay) {
                this.currentTimeDisplay.textContent = this.formatShort(this.wavesurfer.getCurrentTime());
            }
            // Auto-stop at end trim
            if (this.wavesurfer.getCurrentTime() >= this.endRatio * this.duration) {
                this.wavesurfer.pause();
                if (!this.isLooping) {
                    this.isPlaying = false;
                    this.updatePlayBtn();
                } else {
                    this.wavesurfer.seekTo(this.startRatio);
                    this.wavesurfer.play();
                }
            }
        });

        this.wavesurfer.on('seek', () => {
            this.updatePlayhead();
            if (this.currentTimeDisplay) {
                this.currentTimeDisplay.textContent = this.formatShort(this.wavesurfer.getCurrentTime());
            }
        });

        this.wavesurfer.on('finish', () => {
            this.isPlaying = false;
            this.updatePlayBtn();
            if (this.isLooping) {
                this.wavesurfer.seekTo(this.startRatio);
                this.wavesurfer.play();
                this.isPlaying = true;
                this.updatePlayBtn();
            }
        });
    }

    // --- Editor ---

    setupEditorListeners() {
        this.playBtn.addEventListener('click', () => this.togglePlay());

        this.loopBtn.addEventListener('click', () => {
            this.isLooping = !this.isLooping;
            this.loopBtn.style.background = this.isLooping ? 'rgba(255,214,10,0.25)' : '';
            this.loopBtn.style.color = this.isLooping ? '#FFD60A' : '';
        });

        this.trimBtn.addEventListener('click', () => this.performTrim());
        this.uploadNewBtn.addEventListener('click', () => this.resetToUpload());

        // Click on timeline to seek
        this.timeline.addEventListener('click', (e) => {
            if (this.isDraggingStart || this.isDraggingEnd || !this.duration || !this.wavesurfer) return;
            var rect = this.timeline.getBoundingClientRect();
            var ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            this.wavesurfer.seekTo(ratio);
        });
    }

    togglePlay() {
        if (!this.wavesurfer) return;
        if (this.isPlaying) {
            this.wavesurfer.pause();
            this.isPlaying = false;
        } else {
            // If at or past end trim, seek to start trim first
            if (this.wavesurfer.getCurrentTime() >= this.endRatio * this.duration - 0.05) {
                this.wavesurfer.seekTo(this.startRatio);
            }
            this.wavesurfer.play();
            this.isPlaying = true;
        }
        this.updatePlayBtn();
    }

    updatePlayBtn() {
        if (!this.playIcon || !this.pauseIcon) return;
        this.playIcon.style.display = this.isPlaying ? 'none' : '';
        this.pauseIcon.style.display = this.isPlaying ? '' : 'none';
    }

    updatePlayhead() {
        if (!this.wavesurfer || !this.duration) return;
        var ratio = this.wavesurfer.getCurrentTime() / this.duration;
        this.playhead.style.left = (ratio * 100) + '%';
    }

    resetToUpload() {
        if (this.wavesurfer) {
            this.wavesurfer.stop();
            this.wavesurfer.destroy();
            this.wavesurfer = null;
        }
        this.isPlaying = false;
        this.isLooping = false;
        this.audioBuffer = null;
        this.rawArrayBuffer = null;
        this.duration = 0;
        this.startRatio = 0;
        this.endRatio = 1;
        this.downloadWrap.style.display = 'none';
        this.trimStatus.style.display = 'none';
        this.audioEditor.style.display = 'none';
        this.uploadContainer.style.display = 'block';
        this.fileInput.value = '';
    }

    // --- Timeline drag ---

    setupTimelineListeners() {
        this.handleStart.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            this.isDraggingStart = true;
            var rect = this.timeline.getBoundingClientRect();
            var pointerRatio = (e.clientX - rect.left) / rect.width;
            this.dragOffsetRatio = pointerRatio - this.startRatio;
        });
        this.handleEnd.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            this.isDraggingEnd = true;
            var rect = this.timeline.getBoundingClientRect();
            var pointerRatio = (e.clientX - rect.left) / rect.width;
            this.dragOffsetRatio = pointerRatio - this.endRatio;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDraggingStart && !this.isDraggingEnd) return;
            var rect = this.timeline.getBoundingClientRect();
            var ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) - this.dragOffsetRatio;
            if (this.isDraggingStart) {
                ratio = Math.min(Math.max(0, ratio), this.endRatio - 0.01);
                this.startRatio = ratio;
                this.updateUI();
            } else if (this.isDraggingEnd) {
                ratio = Math.max(Math.min(1, ratio), this.startRatio + 0.01);
                this.endRatio = ratio;
                this.updateUI();
            }
        });

        document.addEventListener('mouseup', () => {
            if ((this.isDraggingStart || this.isDraggingEnd) && this.wavesurfer && this.duration) {
                var seekTo = this.isDraggingStart ? this.startRatio : this.endRatio;
                this.wavesurfer.seekTo(seekTo);
            }
            this.isDraggingStart = false;
            this.isDraggingEnd = false;
        });

        this.handleStart.addEventListener('touchstart', (e) => {
            e.preventDefault(); e.stopPropagation();
            this.isDraggingStart = true;
            var rect = this.timeline.getBoundingClientRect();
            var pointerRatio = (e.touches[0].clientX - rect.left) / rect.width;
            this.dragOffsetRatio = pointerRatio - this.startRatio;
        }, { passive: false });
        this.handleEnd.addEventListener('touchstart', (e) => {
            e.preventDefault(); e.stopPropagation();
            this.isDraggingEnd = true;
            var rect = this.timeline.getBoundingClientRect();
            var pointerRatio = (e.touches[0].clientX - rect.left) / rect.width;
            this.dragOffsetRatio = pointerRatio - this.endRatio;
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!this.isDraggingStart && !this.isDraggingEnd) return;
            var touch = e.touches[0];
            var rect = this.timeline.getBoundingClientRect();
            var ratio = Math.min(1, Math.max(0, (touch.clientX - rect.left) / rect.width)) - this.dragOffsetRatio;
            if (this.isDraggingStart) {
                ratio = Math.min(Math.max(0, ratio), this.endRatio - 0.01);
                this.startRatio = ratio;
                this.updateUI();
            } else if (this.isDraggingEnd) {
                ratio = Math.max(Math.min(1, ratio), this.startRatio + 0.01);
                this.endRatio = ratio;
                this.updateUI();
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if ((this.isDraggingStart || this.isDraggingEnd) && this.wavesurfer && this.duration) {
                var seekTo = this.isDraggingStart ? this.startRatio : this.endRatio;
                this.wavesurfer.seekTo(seekTo);
            }
            this.isDraggingStart = false;
            this.isDraggingEnd = false;
        });
    }

    updateUI() {
        var s = this.startRatio;
        var e = this.endRatio;

        this.dimLeft.style.width = (s * 100) + '%';
        this.dimRight.style.width = ((1 - e) * 100) + '%';
        this.trimRegion.style.left = (s * 100) + '%';
        this.trimRegion.style.width = ((e - s) * 100) + '%';
        this.handleStart.style.left = (s * 100) + '%';
        this.handleStart.style.right = '';
        this.handleEnd.style.right = ((1 - e) * 100) + '%';
        this.handleEnd.style.left = '';

        var startSec = s * this.duration;
        var endSec = e * this.duration;
        this.tooltipStart.textContent = this.formatShort(startSec);
        this.tooltipEnd.textContent = this.formatShort(endSec);
        this.clipDuration.textContent = this.formatShort(endSec - startSec);
    }

    // --- Trim ---

    async performTrim() {
        if (!this.audioBuffer) {
            this.showStatus('No audio loaded.', 'error');
            return;
        }

        var startSec = this.startRatio * this.duration;
        var endSec = this.endRatio * this.duration;

        if (endSec <= startSec) {
            this.showStatus('End time must be after start time.', 'error');
            return;
        }

        this.trimBtn.disabled = true;
        this.showStatus('Trimming...', 'info');

        try {
            const decodeCtx = new AudioContext();
            const freshBuffer = await decodeCtx.decodeAudioData(this.rawArrayBuffer.slice(0));
            await decodeCtx.close();

            const trimmed = await this.trimAudio(freshBuffer, startSec, endSec);
            const format = this.outputFormat.value;
            let blob;
            if (format === 'webm') {
                blob = await this.encodeToWebM(trimmed);
            } else {
                blob = this.audioBufferToWav(trimmed);
            }

            const ext = format === 'webm' ? 'webm' : 'wav';
            const url = URL.createObjectURL(blob);
            this.downloadBtn.href = url;
            this.downloadBtn.download = this.sourceFileName + '_trimmed.' + ext;
            this.downloadWrap.style.display = 'block';
            this.showStatus('Done!', 'success');
        } catch (err) {
            this.showStatus('Trim failed: ' + err.message, 'error');
        } finally {
            this.trimBtn.disabled = false;
        }
    }

    async trimAudio(audioBuffer, startSec, endSec) {
        const sampleRate = audioBuffer.sampleRate;
        const channels = audioBuffer.numberOfChannels;
        const startSample = Math.floor(startSec * sampleRate);
        const endSample = Math.floor(endSec * sampleRate);
        const length = endSample - startSample;
        const ctx = new AudioContext();
        const trimmed = ctx.createBuffer(channels, length, sampleRate);
        for (let ch = 0; ch < channels; ch++) {
            trimmed.getChannelData(ch).set(audioBuffer.getChannelData(ch).slice(startSample, endSample));
        }
        await ctx.close();
        return trimmed;
    }

    audioBufferToWav(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const numSamples = buffer.length;
        const dataLength = numSamples * numChannels * 2;
        const bufferOut = new ArrayBuffer(44 + dataLength);
        const view = new DataView(bufferOut);
        const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
        writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataLength, true);
        writeStr(8, 'WAVE'); writeStr(12, 'fmt '); view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true); view.setUint16(34, 16, true);
        writeStr(36, 'data'); view.setUint32(40, dataLength, true);
        let offset = 44;
        for (let i = 0; i < numSamples; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }
        return new Blob([bufferOut], { type: 'audio/wav' });
    }

    async encodeToWebM(audioBuffer) {
        const ctx = new AudioContext({ sampleRate: audioBuffer.sampleRate });
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        const dest = ctx.createMediaStreamDestination();
        source.connect(dest);
        return new Promise((resolve, reject) => {
            const chunks = [];
            let recorder;
            try {
                recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
            } catch (e) {
                ctx.close();
                reject(new Error('WebM not supported. Try WAV.'));
                return;
            }
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = () => { ctx.close(); resolve(new Blob(chunks, { type: 'audio/webm' })); };
            recorder.onerror = (e) => { ctx.close(); reject(new Error('MediaRecorder error: ' + e.error)); };
            recorder.start();
            source.start();
            source.onended = () => recorder.stop();
        });
    }

    // --- Status ---

    showStatus(message, type) {
        this.trimStatus.textContent = message;
        this.trimStatus.style.display = 'block';
        if (type === 'error') {
            this.trimStatus.style.color = '#ff6b6b';
        } else if (type === 'success') {
            this.trimStatus.style.color = '#FFD60A';
        } else {
            this.trimStatus.style.color = 'rgba(255,255,255,0.7)';
        }
    }

    // --- Time helpers ---

    formatShort(totalSeconds) {
        totalSeconds = Math.max(0, totalSeconds);
        var m = Math.floor(totalSeconds / 60);
        var s = Math.floor(totalSeconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AudioClipper();
});
