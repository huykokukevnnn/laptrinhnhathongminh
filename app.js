/**
 * AI Smart Home - Game Giáo Dục Trải Nghiệm & Lập Trình AI
 * Tác giả: Antigravity Code Assistant
 * Công nghệ: Vanilla JS, Web Audio API, SVG Interactivity, Touch/Mouse Event Drawing
 */

// --- 1. HỆ THỐNG ÂM THANH DỰA TRÊN WEB AUDIO API ---
const SoundManager = {
    ctx: null,
    muted: false,

    init() {
        // Khởi tạo AudioContext khi người dùng tương tác lần đầu
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    },

    playBeep(freq = 600, duration = 0.08, type = 'sine') {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.log("Audio play error", e);
        }
    },

    playSuccess() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // Đô - Mi - Sol - Đô (C5-E5-G5-C6)
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playBeep(freq, 0.25, 'triangle');
            }, i * 80);
        });
    },

    playSwoosh() {
        if (this.muted) return;
        this.init();
        try {
            const bufferSize = this.ctx.sampleRate * 0.4;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Tạo tiếng ồn trắng (white noise)
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            // Quét tần số lọc từ cao xuống thấp để tạo tiếng gió lướt qua
            filter.frequency.setValueAtTime(3000, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.35);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            noise.start();
            noise.stop(this.ctx.currentTime + 0.4);
        } catch (e) {
            this.playBeep(300, 0.3, 'sawtooth');
        }
    },

    playChime() {
        if (this.muted) return;
        this.playBeep(880, 0.15, 'sine');
        setTimeout(() => this.playBeep(1320, 0.25, 'sine'), 100);
    },

    melodyInterval: null,
    melodyNotes: [
        { freq: 261.63, dur: 0.4 }, // C4
        { freq: 329.63, dur: 0.4 }, // E4
        { freq: 392.00, dur: 0.4 }, // G4
        { freq: 440.00, dur: 0.4 }, // A4
        { freq: 523.25, dur: 0.8 }, // C5
        { freq: 440.00, dur: 0.4 }, // A4
        { freq: 392.00, dur: 0.4 }, // G4
        { freq: 329.63, dur: 0.4 }  // E4
    ],
    melodyIndex: 0,

    startRoyaltyFreeMusic() {
        if (this.melodyInterval) return;
        this.melodyIndex = 0;
        this.init();
        
        this.melodyInterval = setInterval(() => {
            if (this.muted) return;
            const note = this.melodyNotes[this.melodyIndex];
            this.playBeep(note.freq, note.dur, 'sine');
            this.melodyIndex = (this.melodyIndex + 1) % this.melodyNotes.length;
        }, 500);
    },

    stopRoyaltyFreeMusic() {
        if (this.melodyInterval) {
            clearInterval(this.melodyInterval);
            this.melodyInterval = null;
        }
    }
};

// --- 2. CẤU HÌNH DỮ LIỆU GAME & TRẠNG THÁI ---
const GameData = {
    // Trạng thái hoạt động của 8 thiết bị ở Phase 1
    deviceStates: {
        fan: false,
        light: false,
        vacuum: false,
        fridge: false,
        ac: false,
        glassdoor: false,
        tv: false,
        speaker: false
    },

    dashboardMetrics: {
        temp: 30,
        air: "Ngột ngạt",
        lock: "ĐANG KHÓA",
        speaker: "ĐANG TẮT"
    },

    commandsTestedCount: 0,
    commandsTestedSet: new Set(),
    requiredCommandsToUnlock: 3,

    // Mối liên kết lập trình dạng If-Then: [ { device: 'fan', command: 'Trời nóng quá', action: 'fan_on' }, ... ]
    connections: []
};

// Cấu hình các tùy chọn cho từng thiết bị trong Phase 2
const DeviceOptions = {
    fan: {
        name: "Quạt điện",
        icon: "💨",
        commands: ["Trời nóng quá", "Trời lạnh quá", "Bật quạt", "Tắt quạt"],
        actions: [
            { text: "Bật quạt đứng", value: "fan_on" },
            { text: "Tắt quạt đứng", value: "fan_off" }
        ]
    },
    ac: {
        name: "Điều hòa",
        icon: "❄️",
        commands: ["Trời nóng quá", "Trời lạnh quá", "Bật máy lạnh", "Tắt máy lạnh"],
        actions: [
            { text: "Bật điều hòa", value: "ac_on" },
            { text: "Tắt điều hòa", value: "ac_off" }
        ]
    },
    tv: {
        name: "Tivi treo tường",
        icon: "📺",
        commands: ["Tôi muốn xem phim", "Tôi không muốn xem phim nữa", "Bật tivi", "Tắt tivi"],
        actions: [
            { text: "Bật tivi", value: "tv_on" },
            { text: "Tắt tivi", value: "tv_off" }
        ]
    },
    fridge: {
        name: "Tủ lạnh",
        icon: "🍎",
        commands: ["Tôi đói bụng", "Mở tủ lạnh", "Đóng tủ lạnh"],
        actions: [
            { text: "Mở tủ lạnh", value: "fridge_open" },
            { text: "Đóng tủ lạnh", value: "fridge_close" }
        ]
    },
    speaker: {
        name: "Loa thông minh",
        icon: "🎵",
        commands: ["Tôi thấy yên tĩnh quá", "Tôi muốn nghe nhạc", "Bật loa", "Tắt loa"],
        actions: [
            { text: "Bật loa phát nhạc", value: "speaker_on" },
            { text: "Tắt loa phát nhạc", value: "speaker_off" }
        ]
    },
    vacuum: {
        name: "Robot hút bụi",
        icon: "🧹",
        commands: ["Nhà dơ quá", "Nhà sạch rồi", "Bật robot hút bụi", "Tắt robot hút bụi"],
        actions: [
            { text: "Bật robot hút bụi", value: "vacuum_on" },
            { text: "Tắt robot hút bụi", value: "vacuum_off" }
        ]
    },
    light: {
        name: "Hệ thống đèn",
        icon: "💡",
        commands: ["Trời tối rồi", "Tôi không thấy đường", "Bật đèn", "Tắt đèn"],
        actions: [
            { text: "Bật đèn chiếu sáng", value: "light_on" },
            { text: "Tắt đèn chiếu sáng", value: "light_off" }
        ]
    }
};

// Bộ quản lý chu kỳ ngày/đêm và mô phỏng nhiệt độ
const CycleManager = {
    duration: 240, // 240 giây một chu kỳ (2 phút sáng, 2 phút tối)
    elapsed: 0,
    intervalId: null,
    isDay: true,
    temp: 32,

    start() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.elapsed = 0;
        this.isDay = true;
        this.temp = 32;
        this.intervalId = setInterval(() => {
            this.elapsed = (this.elapsed + 1) % this.duration;
            this.update();
        }, 1000);
        this.update();
    },

    toggleDayNight() {
        if (this.isDay) {
            this.elapsed = 120; // Chuyển sang bắt đầu ban đêm
        } else {
            this.elapsed = 0; // Chuyển sang bắt đầu ban ngày
        }
        this.update();
    },

    update() {
        this.isDay = this.elapsed < 120;
        
        // Mô phỏng nhiệt độ:
        // Ban ngày: Tăng dần từ 25 lên 32°C trong 40 giây đầu, duy trì ở 32°C
        // Ban đêm: Giảm dần từ 32 xuống 25°C trong 40 giây đầu, duy trì ở 25°C
        let dayRatio = 0;
        if (this.isDay) {
            if (this.elapsed < 40) {
                dayRatio = this.elapsed / 40;
                this.temp = 25 + (32 - 25) * dayRatio;
            } else {
                dayRatio = 1;
                this.temp = 32;
            }
        } else {
            const nightElapsed = this.elapsed - 120;
            if (nightElapsed < 40) {
                dayRatio = 1 - (nightElapsed / 40);
                this.temp = 32 - (32 - 25) * (nightElapsed / 40);
            } else {
                dayRatio = 0;
                this.temp = 25;
            }
        }
        
        this.temp = Math.round(this.temp);
        
        // Cập nhật text hiển thị nhiệt độ
        document.querySelectorAll('.temp-val').forEach(el => {
            el.textContent = this.temp;
        });

        // Cập nhật màu bầu trời và độ sáng phòng
        this.updateVisuals(dayRatio);
        
        // Kiểm tra và kích hoạt các quy tắc tự động hóa nếu có lập trình
        this.checkAutomatedRules();
    },

    updateVisuals(dayRatio) {
        // Nội suy màu gradient của bầu trời ban công
        const stop1_day = [2, 132, 199];
        const stop1_night = [10, 15, 29];
        
        const stop2_day = [56, 189, 248];
        const stop2_night = [22, 30, 56];
        
        const stop3_day = [186, 230, 253];
        const stop3_night = [36, 50, 86];
        
        const interpolateColor = (c1, c2, ratio) => {
            const r = Math.round(c1[0] + (c2[0] - c1[0]) * ratio);
            const g = Math.round(c1[1] + (c2[1] - c1[1]) * ratio);
            const b = Math.round(c1[2] + (c2[2] - c1[2]) * ratio);
            return `rgb(${r}, ${g}, ${b})`;
        };
        
        const color1 = interpolateColor(stop1_night, stop1_day, dayRatio);
        const color2 = interpolateColor(stop2_night, stop2_day, dayRatio);
        const color3 = interpolateColor(stop3_night, stop3_day, dayRatio);
        
        const balconySky = document.getElementById('balconySky');
        if (balconySky) {
            const stops = balconySky.querySelectorAll('stop');
            if (stops.length >= 3) {
                stops[0].setAttribute('stop-color', color1);
                stops[1].setAttribute('stop-color', color2);
                stops[2].setAttribute('stop-color', color3);
            }
        }
        
        // Làm mờ mây vào ban đêm
        const clouds = document.getElementById('balcony-clouds');
        if (clouds) {
            clouds.style.opacity = (0.6 * dayRatio).toFixed(2);
        }
        
        // Làm tối phòng theo thời gian
        const isLightOn = GameData.deviceStates.light;
        const roomDimOverlay = document.getElementById('roomDimOverlay');
        if (roomDimOverlay) {
            if (isLightOn) {
                roomDimOverlay.style.opacity = '0';
            } else {
                // Tối tối đa ban đêm là 0.85, sáng ban ngày là 0.2
                const maxDim = 0.85;
                const minDim = 0.2;
                const currentDim = minDim + (maxDim - minDim) * (1 - dayRatio);
                roomDimOverlay.style.opacity = currentDim.toFixed(2);
            }
        }
    },

    checkAutomatedRules() {
        if (App.currentScreen !== 'testing') return;
        
        // 1. Tự động bật đèn khi trời tối
        const lightOnRule = App.checkRuleForDevice('light', ['Trời tối rồi', 'Tôi không thấy đường'], 'light_on');
        if (!this.isDay && !GameData.deviceStates.light && lightOnRule) {
            App.toggleDevice('light', true);
            App.appendChatMessage('🤖 Trợ Lý LUNA: Phát hiện trời tối! Cảm biến tự động bật đèn theo lập trình của bạn. 💡', 'ai');
        }
        
        // 2. Tự động bật điều hòa khi nóng (>= 32°C)
        const acOnRule = App.checkRuleForDevice('ac', ['Trời nóng quá'], 'ac_on');
        if (this.temp >= 32 && !GameData.deviceStates.ac && acOnRule) {
            App.toggleDevice('ac', true);
            App.appendChatMessage('🤖 Trợ Lý LUNA: Phát hiện nhiệt độ đạt 32°C! Tự động bật máy lạnh theo lập trình. ❄️', 'ai');
        }
        
        // 3. Tự động tắt điều hòa khi lạnh (<= 25°C)
        const acOffRule = App.checkRuleForDevice('ac', ['Trời lạnh quá'], 'ac_off');
        if (this.temp <= 25 && GameData.deviceStates.ac && acOffRule) {
            App.toggleDevice('ac', false);
            App.appendChatMessage('🤖 Trợ Lý LUNA: Phát hiện nhiệt độ giảm xuống 25°C! Tự động tắt máy lạnh theo lập trình. 🌡️', 'ai');
        }
    }
};

// --- 3. KHỞI TẠO VÀ BẮT ĐẦU APP ---
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    currentScreen: 'intro',
    activeDeviceTabs: ['fan', 'light'],
    activeDeviceTab: 'fan',

    init() {
        this.bindGlobalEvents();
        this.initPhase1();
        this.initPhase2();
        
        // Khởi động vòng lặp sáng/tối và nhiệt độ
        CycleManager.start();

        // Mặc định cập nhật giao diện Dashboard
        this.updateDashboardUI();
    },

    // Quản lý chuyển đổi màn hình game mượt mà
    showScreen(screenId) {
        SoundManager.playSwoosh();
        
        // Ẩn tất cả các màn hình
        document.querySelectorAll('.screen-container').forEach(screen => {
            screen.classList.remove('active');
        });

        // Hiển thị màn hình mong muốn
        const targetScreen = document.getElementById(`${screenId}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }

        // Cập nhật thanh chỉ thị tiến trình (Step Indicators)
        const step1 = document.getElementById('step-indicator-1');
        const step2 = document.getElementById('step-indicator-2');
        
        if (screenId === 'intro' || screenId === 'phase1') {
            step1.classList.add('active');
            step1.classList.remove('completed');
            step2.classList.remove('active', 'completed');
        } else if (screenId === 'phase2') {
            step1.classList.add('completed');
            step1.classList.remove('active');
            step2.classList.add('active');
            step2.classList.remove('completed');
            this.renderTabProgramming();
        } else if (screenId === 'testing') {
            step1.classList.add('completed');
            step2.classList.add('completed');
            step2.classList.remove('active');
        }
    },

    bindGlobalEvents() {
        // Sự kiện gõ cửa vào nhà ở màn hình Intro
        document.getElementById('svg-front-door').addEventListener('click', () => {
            SoundManager.playChime();
            
            // Thêm hiệu ứng flash cửa
            const door = document.getElementById('svg-front-door');
            door.style.filter = "drop-shadow(0 0 30px #ffffff)";
            
            setTimeout(() => {
                door.style.filter = "";
                this.showScreen('phase1');
            }, 600);
        });

        // Bấm nút chơi lại từ đầu
        document.getElementById('btn-restart-app').addEventListener('click', () => {
            if (confirm("Bạn có muốn chơi lại game từ đầu không?")) {
                this.resetWholeGame();
            }
        });

        // Bấm nút loa bật/tắt âm thanh
        const btnSound = document.getElementById('btn-sound-toggle');
        btnSound.addEventListener('click', () => {
            const isMuted = SoundManager.toggleMute();
            const soundText = document.getElementById('sound-text');
            const soundIcon = document.getElementById('sound-icon');
            
            if (isMuted) {
                soundText.innerText = "Âm thanh: Tắt";
                soundIcon.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
            } else {
                soundText.innerText = "Âm thanh: Bật";
                soundIcon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
                SoundManager.playBeep(700, 0.1);
            }
        });

        // Bấm nút chuyển giai đoạn 2
        document.getElementById('btn-to-phase-2').addEventListener('click', () => {
            this.showScreen('phase2');
        });

        // Đóng mở Modal Gợi Ý Câu Lệnh
        document.getElementById('btn-show-help').addEventListener('click', () => {
            SoundManager.playBeep(500, 0.08);
            document.getElementById('modal-help-commands').classList.add('active');
        });

        document.getElementById('btn-close-help').addEventListener('click', () => {
            SoundManager.playBeep(400, 0.08);
            document.getElementById('modal-help-commands').classList.remove('active');
        });

        // Đóng modal khi bấm ra ngoài vùng chứa
        document.getElementById('modal-help-commands').addEventListener('click', (e) => {
            if (e.target.id === 'modal-help-commands') {
                document.getElementById('modal-help-commands').classList.remove('active');
            }
        });

        // Bấm vào gợi ý lệnh để chèn tự động vào input chat
        document.querySelectorAll('.help-command-item').forEach(item => {
            item.addEventListener('click', () => {
                const cmd = item.getAttribute('data-cmd');
                document.getElementById('chat-input-field').value = cmd;
                document.getElementById('modal-help-commands').classList.remove('active');
                document.getElementById('chat-input-field').focus();
                SoundManager.playBeep(650, 0.08);
            });
        });
    },

    // --- GIAI ĐOẠN 1: KHÁM PHÁ AI SMART HOME ---
    initPhase1() {
        const form = document.getElementById('chat-form-input');
        const input = document.getElementById('chat-input-field');
        const micBtn = document.getElementById('btn-mic-input');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            // Xử lý gửi tin nhắn của học sinh
            this.appendChatMessage(text, 'user');
            input.value = '';

            // AI phân tích và phản hồi sau 0.6 giây
            setTimeout(() => {
                this.processAICommand(text);
            }, 600);
        });

        // --- KHỞI TẠO BỘ THU ÂM GIỌNG NÓI MICRO (WEB SPEECH API) ---
        if (micBtn) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = 'vi-VN'; // Cài đặt nhận diện tiếng Việt
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;
                
                let micActive = false;

                recognition.onstart = () => {
                    micBtn.classList.add('recording');
                    input.placeholder = "LUNA đang luôn nghe giọng của bạn...";
                    SoundManager.playBeep(800, 0.12, 'sine');
                };

                recognition.onresult = (event) => {
                    const speechResult = event.results[event.results.length - 1][0].transcript;
                    input.value = speechResult;
                    
                    // Phát tiếng chuông báo nhận diện thành công và tự động submit
                    SoundManager.playChime();
                    setTimeout(() => {
                        form.dispatchEvent(new Event('submit'));
                    }, 500);
                };

                recognition.onerror = (event) => {
                    console.error("Speech recognition error", event.error);
                    
                    if (event.error === 'not-allowed') {
                        micActive = false;
                        micBtn.classList.remove('recording');
                        let errorMsg = "Quyền truy cập Micro bị từ chối. Bạn vui lòng cấp quyền cho trình duyệt truy cập Micro!";
                        this.appendChatMessage(`Hệ thống: ${errorMsg}`, 'system');
                        input.placeholder = "Nhập câu lệnh trực tiếp hoặc ngữ cảnh...";
                        SoundManager.playBeep(300, 0.15, 'sine');
                    }
                };

                recognition.onend = () => {
                    // Nếu chế độ micActive vẫn bật, tự động khởi động lại nhận diện để luôn chờ giọng!
                    if (micActive) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.error("Lỗi khi khởi động lại nhận dạng giọng nói:", e);
                        }
                    } else {
                        micBtn.classList.remove('recording');
                        input.placeholder = "Nhập câu lệnh trực tiếp hoặc ngữ cảnh...";
                    }
                };

                micBtn.addEventListener('click', () => {
                    micActive = !micActive;
                    if (micActive) {
                        recognition.start();
                    } else {
                        recognition.stop();
                    }
                });
            } else {
                // Trình duyệt không hỗ trợ Web Speech API (như Firefox hoặc trình duyệt cũ)
                micBtn.addEventListener('click', () => {
                    alert("Trình duyệt của bạn chưa hỗ trợ tính năng thu âm Web Speech API. Bạn vui lòng sử dụng Google Chrome hoặc Microsoft Edge bản mới, hoặc nhập câu lệnh bằng bàn phím nhé!");
                    SoundManager.playBeep(350, 0.15, 'sine');
                });
            }
        }
    },

    appendChatMessage(text, sender) {
        const logContainer = document.getElementById('chat-history-log');
        if (!logContainer) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender}`;

        const timeSpan = `<span class="chat-msg-time">${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>`;

        if (sender === 'user') {
            msgDiv.innerHTML = `<strong>Bạn:</strong> ${text} ${timeSpan}`;
        } else if (sender === 'ai') {
            const formattedText = text.replace(/\n/g, '<br>');
            msgDiv.innerHTML = `<strong>LUNA:</strong> ${formattedText} ${timeSpan}`;
        } else {
            msgDiv.innerHTML = `${text} ${timeSpan}`;
        }

        logContainer.appendChild(msgDiv);
        logContainer.scrollTop = logContainer.scrollHeight;
    },

    processAICommand(text) {
        if (!text) return;
        const trimmedText = text.trim();
        
        // Tách câu lệnh theo các liên từ tiếng Việt: và, đồng thời, rồi, sau đó, dấu phẩy, dấu chấm phẩy
        const subCommands = trimmedText.split(/\s*(?:và|đồng thời|rồi|sau đó|,|;)\s*/gi).filter(Boolean);
        
        let allActions = [];
        let explanations = [];
        let triggeredCount = 0;
        
        subCommands.forEach(subCmd => {
            const result = this.parseSingleCommand(subCmd);
            if (result.triggered) {
                triggeredCount++;
                allActions.push(...result.actions);
                explanations.push(result.explanation);
            }
        });
        
        let reply = "";
        
        if (triggeredCount > 0) {
            // Thực thi đồng thời tất cả các hành động thiết bị
            allActions.forEach(action => {
                this.toggleDevice(action.devName, action.state);
            });
            
            // Tổng hợp và làm sạch các chuỗi giải thích
            const uniqueExplanations = [...new Set(explanations)].filter(Boolean);
            
            if (subCommands.length > 1) {
                reply = `🤖 Trợ Lý LUNA: Thực thi gộp ${triggeredCount} câu lệnh cùng lúc!\n\n` + 
                        uniqueExplanations.map((exp, idx) => `${idx + 1}. ${exp}`).join("\n");
            } else {
                reply = uniqueExplanations[0] || "Đã thực hiện lệnh của bạn.";
            }
            
            SoundManager.playSuccess();
        } else {
            reply = "Tôi đã ghi nhận ý kiến của bạn, nhưng bộ não AI hiện tại chưa được lập trình để hiểu câu lệnh này. Hãy thử câu lệnh trực tiếp như 'Bật quạt', 'Sàn nhà dơ' hoặc bấm 'Gợi Ý' để xem danh sách nhé!";
            SoundManager.playBeep(300, 0.15, 'sine');
        }
        
        this.appendChatMessage(reply, 'ai');
        
        const lunaSpeech = document.getElementById('luna-speech-text');
        if (lunaSpeech) {
            lunaSpeech.innerText = reply;
        }

        // Cập nhật bộ đếm thử nghiệm học sinh tại Phase 1
        if (triggeredCount > 0 && !GameData.commandsTestedSet.has(trimmedText)) {
            GameData.commandsTestedSet.add(trimmedText);
            GameData.commandsTestedCount += triggeredCount;
            
            if (GameData.commandsTestedCount >= GameData.requiredCommandsToUnlock) {
                const btnNext = document.getElementById('btn-to-phase-2');
                if (btnNext) {
                    btnNext.classList.add('ready');
                    btnNext.title = "Tuyệt vời! Bạn đã sẵn sàng bước sang lập trình AI mới!";
                }
            }
        }
    },

    parseSingleCommand(sentenceText) {
        const text = sentenceText.toLowerCase().trim();
        let triggered = false;
        let actions = [];
        let explanation = "";

        // 1. Thiết bị Quạt (fan) - Tắt trước, Bật sau
        if (this.matchKeywords(text, ["tắt quạt", "tat quat", "dừng quạt", "ngừng quạt"])) {
            actions.push({ devName: 'fan', state: false });
            explanation = "Đã tắt quạt đứng. Cánh quạt đã ngừng quay.";
            triggered = true;
        } else if (this.matchKeywords(text, ["bật quạt", "bat quat", "mở quạt", "mo quat", "quay quạt"])) {
            actions.push({ devName: 'fan', state: true });
            explanation = "Đã bật quạt đứng! Bạn sẽ thấy cánh quạt bắt đầu xoay tít mát mẻ.";
            triggered = true;
        }
        
        // 2. Thiết bị Đèn LED áp tường (light) - Tắt trước, Bật sau
        else if (this.matchKeywords(text, ["tắt đèn", "tat den"])) {
            actions.push({ devName: 'light', state: false });
            explanation = "Đã tắt đèn LED áp tường. Căn phòng trở lại bình thường.";
            triggered = true;
        } else if (this.matchKeywords(text, ["bật đèn", "bat den", "mở đèn", "mo den", "bật ánh sáng", "thắp sáng"])) {
            actions.push({ devName: 'light', state: true });
            explanation = "Đèn LED áp tường đã được bật! Hai chùm sáng cone thắp sáng hai bên tường phòng khách.";
            triggered = true;
        }

        // 3. Thiết bị Robot hút bụi (vacuum) - Tắt trước, Bật sau
        else if (this.matchKeywords(text, ["dừng hút", "dung hut", "tắt robot", "tat robot", "dừng robot", "tắt máy hút bụi", "tat may hut bui"])) {
            actions.push({ devName: 'vacuum', state: false });
            explanation = "Robot hút bụi đã tạm dừng công việc dọn dẹp.";
            triggered = true;
        } else if (this.matchKeywords(text, ["sàn nhà dơ", "san nha do", "sàn nhà bẩn", "san nha ban", "nhà bẩn", "nha ban", "nhà dơ", "nha do", "sàn dơ", "san do", "sàn bẩn", "san ban", "bụi", "bui", "rác", "rac"])) {
            actions.push({ devName: 'vacuum', state: true });
            explanation = "🚨 Phân tích AI: Ngữ cảnh 'Sàn dơ' -> Đã bật Robot hút bụi dọn dẹp sàn nhà dơ bẩn sạch sẽ!";
            triggered = true;
        } else if (this.matchKeywords(text, ["hút bụi", "hut bui", "quét nhà", "quet nha", "dọn dẹp", "don dep", "kích hoạt robot"])) {
            actions.push({ devName: 'vacuum', state: true });
            explanation = "Robot hút bụi thông minh đang tự trượt đi dọn sàn nhà cho sạch sẽ!";
            triggered = true;
        }

        // 4. Thiết bị Tủ lạnh 2 cánh (fridge) - Đóng/Tắt trước, Mở sau để tránh lỗi đè từ khóa
        else if (this.matchKeywords(text, ["đóng tủ lạnh", "dong tu lanh", "tắt tủ lạnh", "tat tu lanh", "đóng tủ", "dong tu"])) {
            actions.push({ devName: 'fridge', state: false });
            explanation = "Đã đóng khít tủ lạnh để tiết kiệm điện năng cho bạn.";
            triggered = true;
        } else if (this.matchKeywords(text, ["mở tủ lạnh", "mo tu lanh", "tủ lạnh"])) {
            actions.push({ devName: 'fridge', state: true });
            explanation = "Tôi đã mở lật 2 cánh cửa tủ lạnh! Đèn ấm áp cùng thực phẩm mát lạnh bên trong đã lộ diện.";
            triggered = true;
        }

        // 5. Thiết bị Máy lạnh (ac) - Tắt trước, Bật sau
        else if (this.matchKeywords(text, ["tắt máy lạnh", "tat may lanh", "tắt điều hòa", "tat dieu hoa"])) {
            actions.push({ devName: 'ac', state: false });
            explanation = "Máy lạnh treo tường đã tắt. Nắp phả gió đóng lại.";
            triggered = true;
        } else if (this.matchKeywords(text, ["bật máy lạnh", "bat may lanh", "bật điều hòa", "bat dieu hoa"])) {
            actions.push({ devName: 'ac', state: true });
            explanation = "Máy lạnh treo tường đã bật! Luồng sóng gió mát lạnh đang phả xuống phòng khách.";
            triggered = true;
        }

        // 6. Thiết bị Cửa kính trượt ban công (glassdoor) - Tắt/Đóng trước, Mở sau
        else if (this.matchKeywords(text, ["đóng cửa kính", "dong cua kinh", "đóng cửa ban công", "khóa cửa kính", "đóng cửa", "tắt cửa", "tat cua"])) {
            actions.push({ devName: 'glassdoor', state: false });
            explanation = "Hai cánh cửa kính đã trượt khít lại để chắn gió và cách âm.";
            triggered = true;
        } else if (this.matchKeywords(text, ["mở cửa kính", "mo cua kinh", "mở cửa ban công", "mở cửa kính ban công", "hãy mở cửa kính ban công", "mở cửa"])) {
            actions.push({ devName: 'glassdoor', state: true });
            explanation = "Đã trượt mở hai cánh cửa kính cường lực sang hai bên để bạn ngắm ban công gió mát tự nhiên nhé!";
            triggered = true;
        }

        // 7. Thiết bị Tivi treo tường (tv) - Tắt trước, Bật sau
        else if (this.matchKeywords(text, ["tắt tivi", "tat tivi", "tắt tv", "tat tv"])) {
            actions.push({ devName: 'tv', state: false });
            explanation = "Đã tắt tivi treo tường. Đèn LED chỉ thị đã chuyển sang màu đỏ tắt nguồn.";
            triggered = true;
        } else if (this.matchKeywords(text, ["bật tivi", "bat tivi", "mở tivi", "mo tivi", "bật tv", "mở tv", "tivi", "xem tivi", "xem tv"])) {
            actions.push({ devName: 'tv', state: true });
            explanation = "Tivi đã được bật";
            triggered = true;
        }

        // 8. Thiết bị Loa đứng dạng trụ (speaker) - Tắt trước, Bật sau
        else if (this.matchKeywords(text, ["tắt loa", "tat loa", "tắt nhạc", "tat nhac", "dừng nhạc", "dung nhac"])) {
            actions.push({ devName: 'speaker', state: false });
            explanation = "Đã tắt loa phát nhạc. Viền LED hồng mờ đi và các nốt nhạc ngừng bay.";
            triggered = true;
        } else if (this.matchKeywords(text, ["bật loa", "bat loa", "mở loa", "mo loa", "phát nhạc", "phat nhac", "bật nhạc", "bat nhac", "mở nhạc", "mo nhac", "nghe nhạc", "nghe nhac"])) {
            actions.push({ devName: 'speaker', state: true });
            explanation = "Cột loa đứng dạng trụ đã được bật! Viền LED hồng neon sang trọng sáng bừng và các nốt nhạc bắt đầu bay lơ lửng vô cùng sống động.";
            triggered = true;
        }

        // --- NHÓM NGỮ CẢNH PHỨC TẠP ---
        else if (this.matchKeywords(text, ["nóng quá", "nong qua", "nực quá", "oi bức", "nóng nực", "trời nóng"])) {
            actions.push({ devName: 'fan', state: true }, { devName: 'ac', state: true });
            explanation = "🚨 Phân tích AI: Ngữ cảnh 'Trời nóng' -> Đã bật cả QUẠT ĐỨNG và MÁY LẠNH treo tường cùng một lúc để hạ nhiệt độ phòng nhanh nhất!";
            triggered = true;
        }
        else if (this.matchKeywords(text, ["tối quá", "toi qua", "không thấy đường", "khong thay duong", "không thấy gì"])) {
            actions.push({ devName: 'light', state: true });
            explanation = "🚨 Phân tích AI: Ngữ cảnh 'Thiếu ánh sáng' -> Đã bật hai chiếc ĐÈN LED ÁP TƯỜNG để rọi chùm sáng cone ấm áp rực rỡ!";
            triggered = true;
        }
        else if (this.matchKeywords(text, ["đói bụng", "đói quá", "doi qua", "thèm ăn", "an gi", "ăn gì"])) {
            actions.push({ devName: 'fridge', state: true });
            explanation = "🚨 Phân tích AI: Ngữ cảnh 'Đói bụng' -> Đã tự động MỞ CỬA TỦ LẠNH 2 CÁNH cho bạn dễ dàng lựa chọn thực phẩm!";
            triggered = true;
        }
        else if (this.matchKeywords(text, ["khát nước", "khat nuoc", "khát quá", "khat qua", "uống nước", "uong nuoc", "muốn uống nước", "nước ngọt"])) {
            actions.push({ devName: 'fridge', state: true });
            explanation = "🚨 Phân tích AI: Ngữ cảnh 'Khát nước' -> Đã tự động MỞ CỬA TỦ LẠNH 2 CÁNH thắp sáng cho bạn dễ dàng lấy nước uống giải khát!";
            triggered = true;
        }
        else if (this.matchKeywords(text, ["thư giãn", "thu gian", "relax", "mệt mỏi", "met moi", "căng thẳng", "cang thang", "xả stress"])) {
            actions.push({ devName: 'ac', state: true }, { devName: 'speaker', state: true });
            explanation = "🚨 Phân tích AI: Ngữ cảnh 'Thư giãn' -> Đã bật ĐIỀU HÒA thổi sóng gió mát rượi và khởi động LOA ĐỨNG trụ quẩy nhạc thư thái vô cùng chill!";
            triggered = true;
        }
        else if (this.matchKeywords(text, ["buồn quá", "buon qua", "chán quá", "chan qua", "giải trí", "giai tri", "buồn chán", "buon chan"])) {
            actions.push({ devName: 'tv', state: true }, { devName: 'speaker', state: true });
            explanation = "🚨 Phân tích AI: Ngữ cảnh 'Buồn chán' -> Đã mở màn hình Tivi nhiễu sóng và bật Loa quẩy nhạc nốt bay sinh động!";
            triggered = true;
        }
        else if (this.matchKeywords(text, ["đi ngủ", "di ngu", "ngủ ngon", "ngu ngon", "buồn ngủ", "buon ngu", "tắt hết", "tat het", "tắt tất cả"])) {
            actions.push(
                { devName: 'glassdoor', state: false },
                { devName: 'vacuum', state: false },
                { devName: 'light', state: false },
                { devName: 'tv', state: false },
                { devName: 'speaker', state: false },
                { devName: 'fan', state: false },
                { devName: 'ac', state: true }
            );
            explanation = "🚨 Phân tích AI: Ngữ cảnh 'Đi ngủ / Tắt hết' -> Đã đóng CỬA KÍNH, tắt ĐÈN, TIVI, LOA, QUẠT, ROBOT dọn dẹp và bật ĐIỀU HÒA mát lạnh để bạn có giấc ngủ ngon nhất!";
            triggered = true;
        }

        return { triggered, actions, explanation };
    },

    matchKeywords(text, keywords) {
        return keywords.some(kw => text.includes(kw));
    },

    toggleDevice(devName, forceState) {
        const targetState = forceState !== undefined ? forceState : !GameData.deviceStates[devName];
        GameData.deviceStates[devName] = targetState;

        // Cập nhật giao diện hình vẽ SVG bằng cách thêm bớt CSS Class
        const element = document.getElementById(`device-${devName}`);
        if (element) {
            if (targetState) {
                element.classList.add(`device-${devName}-on`);
            } else {
                element.classList.remove(`device-${devName}-on`);
            }
        }

        // Tự động tối/sáng căn phòng khi bật/tắt đèn
        if (devName === 'light') {
            const containers = document.querySelectorAll('.inner-room-container');
            containers.forEach(container => {
                if (targetState) {
                    container.classList.add('device-light-on');
                } else {
                    container.classList.remove('device-light-on');
                }
            });
        }

        // Tự động cập nhật số liệu Dashboard theo hoạt động
        if (devName === 'ac' && targetState) {
            GameData.dashboardMetrics.temp = 24;
        } else if (devName === 'ac' && !targetState) {
            GameData.dashboardMetrics.temp = 30; // Trở về mặc định
        }

        if (devName === 'vacuum') {
            GameData.dashboardMetrics.air = targetState ? "Tuyệt vời (Sạch)" : "Ngột ngạt";
        }

        if (devName === 'speaker') {
            if (targetState) {
                SoundManager.startRoyaltyFreeMusic();
            } else {
                SoundManager.stopRoyaltyFreeMusic();
            }
        }

        if (devName === 'tv') {
            const tvVideo = document.getElementById('tvVideo');
            if (tvVideo) {
                if (targetState) {
                    tvVideo.loop = true; // Kích hoạt loop vô hạn bằng code JS cho chắc chắn
                    tvVideo.muted = false; // Mở khóa âm thanh để nghe được tiếng của clip!
                    tvVideo.volume = 0.5; // Đặt âm lượng cố định ở mức 50% nghe êm ái hơn
                    tvVideo.play().catch(e => {
                        console.log("Video auto-play blocked with sound, attempting muted: ", e);
                        // Fallback: Nếu trình duyệt quá khắt khe chặn phát tiếng, tắt tiếng để giữ video chạy mượt mà
                        tvVideo.muted = true;
                        tvVideo.play().catch(err => console.log("Muted video     // --- GIAI ĐOẠN 2: TỰ TAY LẬP TRÌNH AI MỚI ---
    initPhase2() {
        this.activeDeviceTabs = ['fan', 'light'];
        this.activeDeviceTab = 'fan';
        this.renderTabProgramming();

        // Nút xóa tất cả kết nối
        document.getElementById('btn-clear-connections').addEventListener('click', () => {
            SoundManager.playBeep(350, 0.12, 'sawtooth');
            GameData.connections = [];
            this.renderTabProgramming();
        });

        // Nút gửi nộp bộ nhớ lập trình AI
        document.getElementById('btn-submit-programming').addEventListener('click', () => {
            const connectedCount = GameData.connections.length;
            if (connectedCount < 1) {
                alert(`Hãy thiết lập ít nhất 1 quy tắc câu lệnh để huấn luyện AI mới nhé!`);
                SoundManager.playBeep(300, 0.2, 'sawtooth');
                return;
            }

            // Tiến hành chuyển giao diện sang giai đoạn Test
            SoundManager.playSuccess();
            this.switchToTestingPhase();
        });

        // Bấm nút quay lại lập trình từ màn Test
        document.getElementById('btn-back-to-programming').addEventListener('click', () => {
            this.showScreen('phase2');
        });

        // Bấm nút hoàn thành vinh danh cuối cùng
        document.getElementById('btn-finish-celebration').addEventListener('click', () => {
            SoundManager.playSuccess();
            document.getElementById('modal-congrats-celebration').classList.add('active');
        });

        // Nút restart trên modal congrats
        document.getElementById('btn-restart-from-congrats').addEventListener('click', () => {
            document.getElementById('modal-congrats-celebration').classList.remove('active');
            this.resetWholeGame();
        });
    },

    renderTabProgramming() {
        const headers = document.getElementById('tab-headers');
        if (!headers) return;
        headers.innerHTML = '';

        // Render tab buttons for active devices
        this.activeDeviceTabs.forEach(devKey => {
            const dev = DeviceOptions[devKey];
            const btn = document.createElement('button');
            btn.className = `tab-header-btn ${devKey === this.activeDeviceTab ? 'active' : ''}`;
            btn.innerHTML = `${dev.icon} ${dev.name}`;
            btn.addEventListener('click', () => {
                this.activeDeviceTab = devKey;
                SoundManager.playBeep(600, 0.06, 'sine');
                this.renderTabProgramming();
            });
            headers.appendChild(btn);
        });

        // Add "+" button if there are remaining devices
        const remainingDevices = Object.keys(DeviceOptions).filter(k => !this.activeDeviceTabs.includes(k));
        if (remainingDevices.length > 0) {
            const addBtn = document.createElement('button');
            addBtn.className = 'tab-header-btn btn-add-tab';
            addBtn.innerHTML = '➕ Thêm thiết bị';
            addBtn.addEventListener('click', () => {
                SoundManager.playBeep(650, 0.08, 'sine');
                this.showAddDeviceDropdown(addBtn, remainingDevices);
            });
            headers.appendChild(addBtn);
        }

        // Render the active tab content
        this.renderActiveTabContent();
        
        // Update connections count badge
        const badgeCount = document.getElementById('connections-count');
        if (badgeCount) {
            badgeCount.textContent = `${this.activeDeviceTabs.length} thiết bị`;
        }

        // Enable or disable submit button based on rules
        const btnSubmit = document.getElementById('btn-submit-programming');
        if (btnSubmit) {
            if (GameData.connections.length > 0) {
                btnSubmit.style.opacity = '1';
                btnSubmit.style.pointerEvents = 'auto';
                btnSubmit.classList.add('pulse-lock');
                btnSubmit.innerHTML = `Hoàn thành Lập trình & Đi Test thử AI 🚀`;
            } else {
                btnSubmit.style.opacity = '0.5';
                btnSubmit.style.pointerEvents = 'none';
                btnSubmit.classList.remove('pulse-lock');
                btnSubmit.innerHTML = `Hãy thiết lập ít nhất 1 quy tắc câu lệnh`;
            }
        }
    },

    showAddDeviceDropdown(anchorBtn, remainingDevices) {
        const oldSelect = document.getElementById('device-select-overlay');
        if (oldSelect) oldSelect.remove();

        const rect = anchorBtn.getBoundingClientRect();
        const selectDiv = document.createElement('div');
        selectDiv.id = 'device-select-overlay';
        selectDiv.style.position = 'absolute';
        selectDiv.style.left = `${rect.left}px`;
        selectDiv.style.top = `${rect.bottom + window.scrollY + 5}px`;
        selectDiv.style.background = '#ffffff';
        selectDiv.style.border = '1px solid var(--border-glass-active)';
        selectDiv.style.borderRadius = '12px';
        selectDiv.style.padding = '0.5rem';
        selectDiv.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
        selectDiv.style.zIndex = '1000';
        selectDiv.style.display = 'flex';
        selectDiv.style.flexDirection = 'column';
        selectDiv.style.gap = '0.25rem';

        remainingDevices.forEach(devKey => {
            const dev = DeviceOptions[devKey];
            const item = document.createElement('div');
            item.style.padding = '0.5rem 1rem';
            item.style.cursor = 'pointer';
            item.style.borderRadius = '8px';
            item.style.fontSize = '0.88rem';
            item.style.fontWeight = '700';
            item.style.color = 'var(--text-main)';
            item.innerHTML = `${dev.icon} ${dev.name}`;
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(2, 132, 199, 0.05)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            item.addEventListener('click', () => {
                this.activeDeviceTabs.push(devKey);
                this.activeDeviceTab = devKey;
                SoundManager.playChime();
                selectDiv.remove();
                this.renderTabProgramming();
            });
            selectDiv.appendChild(item);
        });

        document.body.appendChild(selectDiv);

        const clickOutside = (e) => {
            if (!selectDiv.contains(e.target) && e.target !== anchorBtn) {
                selectDiv.remove();
                document.removeEventListener('click', clickOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', clickOutside), 10);
    },

    renderActiveTabContent() {
        const info = document.getElementById('active-device-info');
        const rulesList = document.getElementById('active-device-rules');
        const devKey = this.activeDeviceTab;
        const dev = DeviceOptions[devKey];

        if (!info || !rulesList) return;

        info.innerHTML = `Thiết bị: <strong>${dev.icon} ${dev.name}</strong>. Tạo quy tắc để dạy AI điều khiển thiết bị này.`;
        rulesList.innerHTML = '';

        const deviceRules = GameData.connections.filter(r => r.device === devKey);

        if (deviceRules.length === 0) {
            rulesList.innerHTML = `<div style="text-align:center; padding: 1.5rem; color: var(--text-muted); font-size: 0.88rem; font-style: italic;">Chưa có câu lệnh nào được lập trình cho thiết bị này. Hãy bấm nút dưới đây để thêm!</div>`;
        } else {
            deviceRules.forEach((rule, idx) => {
                const row = document.createElement('div');
                row.className = 'rule-row';

                let commandOptionsHtml = `<option value="">-- Chọn câu lệnh --</option>`;
                dev.commands.forEach(cmd => {
                    commandOptionsHtml += `<option value="${cmd}" ${rule.command === cmd ? 'selected' : ''}>"${cmd}"</option>`;
                });

                let actionOptionsHtml = `<option value="">-- Chọn hành động --</option>`;
                dev.actions.forEach(act => {
                    actionOptionsHtml += `<option value="${act.value}" ${rule.action === act.value ? 'selected' : ''}>${act.text}</option>`;
                });

                row.innerHTML = `
                    <span class="rule-label if-label">Nếu</span>
                    <select class="rule-select rule-command" data-idx="${idx}">
                        ${commandOptionsHtml}
                    </select>
                    <span class="rule-label then-label">Thì</span>
                    <select class="rule-select rule-action" data-idx="${idx}">
                        ${actionOptionsHtml}
                    </select>
                    <button class="btn-delete-rule" data-idx="${idx}" title="Xóa quy tắc này">&times;</button>
                `;

                const cmdSelect = row.querySelector('.rule-command');
                const actSelect = row.querySelector('.rule-action');
                const btnDel = row.querySelector('.btn-delete-rule');

                const updateRule = () => {
                    rule.command = cmdSelect.value;
                    rule.action = actSelect.value;
                    this.renderTabProgramming();
                };

                cmdSelect.addEventListener('change', updateRule);
                actSelect.addEventListener('change', updateRule);
                
                btnDel.addEventListener('click', () => {
                    const globalIdx = GameData.connections.indexOf(rule);
                    if (globalIdx !== -1) {
                        GameData.connections.splice(globalIdx, 1);
                        SoundManager.playBeep(450, 0.1, 'sawtooth');
                        this.renderTabProgramming();
                    }
                });

                rulesList.appendChild(row);
            });
        }

        const btnAddRule = document.getElementById('btn-add-new-rule');
        const newBtnAddRule = btnAddRule.cloneNode(true);
        btnAddRule.parentNode.replaceChild(newBtnAddRule, btnAddRule);

        newBtnAddRule.addEventListener('click', () => {
            GameData.connections.push({
                device: devKey,
                command: '',
                action: ''
            });
            SoundManager.playBeep(600, 0.08, 'sine');
            this.renderTabProgramming();
        });
    },

    checkRuleForDevice(devKey, commandsArray, actionValue) {
        return GameData.connections.some(rule => {
            if (rule.device !== devKey) return false;
            const matchCmd = commandsArray.includes(rule.command);
            const matchAct = actionValue ? rule.action === actionValue : true;
            return matchCmd && matchAct;
        });
    },

    // --- GIAI ĐOẠN 2 - THỬ NGHIỆM AI TỰ HUẤN LUYỆN (TESTING) ---
    switchToTestingPhase() {
        this.migrateRoomSVG('inner-room-container-test');

        for (let dev in GameData.deviceStates) {
            this.toggleDevice(dev, false);
        }

        // Dọn sạch rác cũ
        const trashLayer = document.getElementById('room-trash-layer');
        if (trashLayer) trashLayer.innerHTML = '';
        this.isRobotCleaning = false;
        if (this.vacuumOffTimeout) clearTimeout(this.vacuumOffTimeout);

        // Tạo 2-3 rác ngẫu nhiên
        const numTrash = Math.floor(Math.random() * 2) + 2;
        for (let i = 0; i < numTrash; i++) {
            setTimeout(() => {
                this.spawnRandomTrash();
            }, i * 200);
        }

        this.renderTestCommandsGrid();
        this.renderCustomRulesTable();
        this.initTrashDragging();

        this.showScreen('testing');
    },

    migrateRoomSVG(targetContainerId) {
        const svg = document.querySelector('.inner-room-svg');
        const targetContainer = document.getElementById(targetContainerId);
        
        if (svg && targetContainer) {
            targetContainer.appendChild(svg);
        }
    },

    renderTestCommandsGrid() {
        const container = document.getElementById('test-quick-commands-container');
        container.innerHTML = '';

        const uniqueCommands = [];
        GameData.connections.forEach(rule => {
            if (!rule.command || !rule.action) return;
            if (!uniqueCommands.includes(rule.command)) {
                uniqueCommands.push(rule.command);
            }
        });

        uniqueCommands.forEach(cmdText => {
            const btn = document.createElement('button');
            btn.className = 'btn-quick-test';
            btn.innerHTML = `
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                Nói: "${cmdText}"
            `;
            btn.addEventListener('click', () => {
                this.executeCustomAICommandText(cmdText);
            });
            container.appendChild(btn);
        });

        // Thêm nút Thả rác giả lập
        const btnTrash = document.createElement('button');
        btnTrash.className = 'btn-quick-test simulation-btn';
        btnTrash.style.borderColor = 'var(--neon-pink)';
        btnTrash.style.color = 'var(--neon-pink)';
        btnTrash.innerHTML = `🗑️ Thả rác ngẫu nhiên`;
        btnTrash.addEventListener('click', () => {
            this.spawnRandomTrash();
        });
        container.appendChild(btnTrash);

        // Thêm nút đổi Ngày/Đêm giả lập
        const btnDayNight = document.createElement('button');
        btnDayNight.className = 'btn-quick-test simulation-btn';
        btnDayNight.style.borderColor = 'var(--neon-cyan)';
        btnDayNight.style.color = 'var(--neon-cyan)';
        btnDayNight.innerHTML = `🌗 Đổi Sáng/Tối`;
        btnDayNight.addEventListener('click', () => {
            CycleManager.toggleDayNight();
        });
        container.appendChild(btnDayNight);

        this.updateTestButtonsActiveState();
    },

    getDeviceFromActionKey(actionKey) {
        if (!actionKey) return '';
        const parts = actionKey.split('_');
        return parts[0];
    },

    updateTestButtonsActiveState() {
        const container = document.getElementById('test-quick-commands-container');
        if (!container) return;

        const btns = container.querySelectorAll('.btn-quick-test:not(.simulation-btn)');
        btns.forEach(btn => {
            const textMatch = btn.textContent.match(/"([^"]+)"/);
            if (textMatch) {
                const cmdText = textMatch[1];
                const rulesForCmd = GameData.connections.filter(r => r.command === cmdText);
                const isAnyDeviceOn = rulesForCmd.some(rule => {
                    const devName = this.getDeviceFromActionKey(rule.action);
                    return GameData.deviceStates[devName] === true;
                });
                if (isAnyDeviceOn) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    },

    renderCustomRulesTable() {
        const tbody = document.getElementById('custom-rules-table-body');
        tbody.innerHTML = '';

        GameData.connections.forEach(rule => {
            if (!rule.command || !rule.action) return;
            const devOpt = DeviceOptions[rule.device];
            const actionOpt = devOpt.actions.find(a => a.value === rule.action);
            const actionText = actionOpt ? actionOpt.text : rule.action;

            const row = document.createElement('div');
            row.className = 'rule-item-row';
            row.innerHTML = `
                <span class="rule-item-speech" style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:0.85rem">${devOpt.icon}</span> "${rule.command}"
                </span>
                <span class="rule-item-arrow-icon">&gt;&gt;</span>
                <span class="rule-item-action">${actionText}</span>
            `;
            tbody.appendChild(row);
        });
    },

    executeCustomAICommandText(cmdText) {
        const matchingRules = GameData.connections.filter(r => r.command === cmdText && r.action);
        if (matchingRules.length === 0) return;

        SoundManager.playSuccess();
        let explanations = [];

        matchingRules.forEach(rule => {
            const devName = rule.device;
            const actionKey = rule.action;
            const isTurnOn = actionKey.endsWith('_on') || actionKey.endsWith('_open');

            this.toggleDevice(devName, isTurnOn);

            const devOpt = DeviceOptions[devName];
            const actionOpt = devOpt.actions.find(a => a.value === actionKey);
            const actionText = actionOpt ? actionOpt.text : actionKey;
            explanations.push(`${devOpt.icon} ${actionText}`);
        });

        const reply = `🤖 Trí tuệ nhân tạo mới thông báo: Nhận tín hiệu câu nói "${cmdText}". Thực thi hành động: ${explanations.join(', ')}.`;
        document.getElementById('luna-speech-text').innerText = reply;

        const orb = document.getElementById('luna-orb-element');
        if (orb) {
            orb.style.transform = 'scale(1.2) translateY(-10px)';
            setTimeout(() => {
                orb.style.transform = '';
            }, 500);
        }
    },

    // --- LOGIC KÉO THẢ VÀ TỰ ĐỘNG HÚT RÁC ---
    initTrashDragging() {
        const panel = document.getElementById('trash-panel');
        if (!panel) return;

        const items = panel.querySelectorAll('.trash-item-draggable');
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.getAttribute('data-type'));
                SoundManager.playBeep(700, 0.05, 'sine');
            });
            item.addEventListener('click', () => {
                this.spawnTrash(item.getAttribute('data-type'));
                SoundManager.playChime();
            });
        });

        const viewports = [
            document.getElementById('room-viewport-container'),
            document.getElementById('test-room-viewport-container')
        ];

        viewports.forEach(vp => {
            if (!vp) return;
            vp.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            vp.addEventListener('drop', (e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('text/plain');
                if (type) {
                    this.spawnTrash(type);
                    SoundManager.playChime();
                }
            });
        });
    },

    spawnTrash(type) {
        const layer = document.getElementById('room-trash-layer');
        if (!layer) return;

        const rx = Math.floor(Math.random() * 300) + 350; // 350 đến 650
        const ry = Math.floor(Math.random() * 30) + 370; // 370 đến 400

        const emojiMap = {
            tissue: '🧻',
            plastic_bag: '🛍️',
            plastic_cup: '🥤',
            plastic_bottle: '🍼'
        };

        const emoji = emojiMap[type] || '🗑️';
        const id = 'trash-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'trash-spawned');
        group.setAttribute('id', id);
        group.setAttribute('data-x', rx);
        group.setAttribute('data-y', ry);
        group.setAttribute('transform', `translate(${rx}, ${ry})`);

        group.innerHTML = `
            <text font-size="20" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
        `;

        layer.appendChild(group);

        this.triggerRobotVacuumCleaning();
    },

    spawnRandomTrash() {
        const types = ['tissue', 'plastic_bag', 'plastic_cup', 'plastic_bottle'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        this.spawnTrash(randomType);
    },

    isRobotCleaning: false,

    triggerRobotVacuumCleaning() {
        if (this.isRobotCleaning) return;
        
        const layer = document.getElementById('room-trash-layer');
        if (!layer) return;
        
        const trashes = layer.querySelectorAll('.trash-spawned');
        if (trashes.length === 0) {
            if (GameData.deviceStates.vacuum) {
                if (this.vacuumOffTimeout) clearTimeout(this.vacuumOffTimeout);
                this.vacuumOffTimeout = setTimeout(() => {
                    const remaining = layer.querySelectorAll('.trash-spawned');
                    if (remaining.length === 0) {
                        this.toggleDevice('vacuum', false);
                        const vacuumBody = document.querySelector('.vacuum-body');
                        if (vacuumBody) {
                            vacuumBody.style.transition = 'transform 2s ease-in-out';
                            vacuumBody.style.transform = 'translateX(0)';
                        }
                    }
                }, 5000);
            }
            return;
        }

        if (this.currentScreen !== 'testing') return;
        
        const isRobotProgrammed = GameData.connections.some(r => r.device === 'vacuum' && r.action === 'vacuum_on');
        if (!isRobotProgrammed) return;

        if (!GameData.deviceStates.vacuum) {
            this.toggleDevice('vacuum', true);
            this.appendChatMessage('🤖 Trợ Lý LUNA: Phát hiện sàn nhà dơ! Robot hút bụi tự động dọn dẹp theo lập trình. 🧹', 'ai');
        }

        this.isRobotCleaning = true;
        if (this.vacuumOffTimeout) {
            clearTimeout(this.vacuumOffTimeout);
            this.vacuumOffTimeout = null;
        }

        const firstTrash = trashes[0];
        const tx = parseFloat(firstTrash.getAttribute('data-x'));

        const vacuumBody = document.querySelector('.vacuum-body');
        if (vacuumBody) {
            vacuumBody.style.transition = 'transform 2s ease-in-out';
            vacuumBody.style.transform = `translateX(${tx - 200}px)`;

            setTimeout(() => {
                this.animateTrashToBin(firstTrash);

                setTimeout(() => {
                    this.isRobotCleaning = false;
                    this.triggerRobotVacuumCleaning();
                }, 600);
            }, 2000);
        }
    },

    animateTrashToBin(trashElement) {
        trashElement.classList.add('trash-flying');
        SoundManager.playBeep(900, 0.1, 'sine');
        
        setTimeout(() => {
            trashElement.remove();
        }, 500);
    },

    // --- HÀM TÁI LẬP TRÌNH & ĐẶT LẠI GAME TOÀN DIỆN ---
    resetWholeGame() {
        this.migrateRoomSVG('inner-room-container');

        GameData.deviceStates = {
            fan: false,
            light: false,
            vacuum: false,
            fridge: false,
            ac: false,
            glassdoor: false,
            tv: false,
            speaker: false
        };
        GameData.dashboardMetrics = {
            temp: 30, air: "Ngột ngạt", lock: "ĐANG KHÓA", speaker: "ĐANG TẮT"
        };
        GameData.commandsTestedCount = 0;
        GameData.commandsTestedSet.clear();
        GameData.connections = [];
        SoundManager.stopRoyaltyFreeMusic();
        if (this.fridgeTimer) {
            clearTimeout(this.fridgeTimer);
            this.fridgeTimer = null;
        }
        const tvVideo = document.getElementById('tvVideo');
        if (tvVideo) {
            tvVideo.pause();
            tvVideo.currentTime = 0;
        }

        // Xóa các CSS Class kích hoạt trong hình vẽ SVG thiết bị
        for (let dev in GameData.deviceStates) {
            const el = document.getElementById(`device-${dev}`);
            if (el) {
                el.classList.remove(`device-${dev}-on`);
            }
        }
        
        const containers = document.querySelectorAll('.inner-room-container');
        containers.forEach(container => {
            container.classList.remove('device-light-on');
        });
        
        const rvc = document.getElementById('room-viewport-container');
        if (rvc) rvc.className = 'room-viewport';
        
        const trvc = document.getElementById('test-room-viewport-container');
        if (trvc) trvc.className = 'room-viewport';
        
        // Cập nhật giao diện Dashboard về mặc định
        this.updateDashboardUI();

        // Reset giao diện Chat Console
        const log = document.getElementById('chat-history-log');
        if (log) {
            log.innerHTML = `
                <div class="chat-msg system">Hệ thống Smart Home AI đã được khởi tạo thành công!</div>
                <div class="chat-msg ai">
                    <strong>LUNA:</strong> Chào mừng bạn đã quay lại! Hãy nhập các câu nói như "Bật quạt", "Sàn nhà dơ", "Nóng quá",... để khám phá nhé!
                    <span class="chat-msg-time">Vừa xong</span>
                </div>
            `;
        }

        // Khóa nút sang Giai đoạn 2
        const btnNext = document.getElementById('btn-to-phase-2');
        if (btnNext) {
            btnNext.classList.remove('ready');
            btnNext.title = "";
        }

        // Reset LUNA speech text
        const lst = document.getElementById('luna-speech-text');
        if (lst) lst.innerText = "Chào mừng bạn đã vào nhà! Tôi là bộ não AI kết nối các thiết bị. Hãy gõ một câu lệnh bên dưới để tôi hỗ trợ bạn nhé!";

        // Reset rác
        const trashLayer = document.getElementById('room-trash-layer');
        if (trashLayer) trashLayer.innerHTML = '';

        // Chuyển màn hình về Intro
        this.showScreen('intro');
    },

    playActionSound(action) {
        if (action === 'click') {
            SoundManager.playBeep(600, 0.08, 'sine');
        }
    }
};
