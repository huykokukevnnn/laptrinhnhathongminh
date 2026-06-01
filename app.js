/**
 * AI Smart Home - Game Giáo Dục Trải Nghiệm & Lập Trình AI
 * Tác giả: Antigravity Code Assistant
 * Công nghệ: Vanilla JS, Web Audio API, SVG Interactivity
 */

// --- 1. HỆ THỐNG ÂM THANH DỰA TRÊN WEB AUDIO API ---
const SoundManager = {
    ctx: null,
    muted: false,

    init() {
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
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
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
    // Trạng thái hoạt động của 8 thiết bị
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

    // Tiếng Việt hiển thị tên các đồ vật
    deviceNames: {
        fan: "Quạt đứng",
        light: "Đèn LED áp tường",
        vacuum: "Robot hút bụi",
        fridge: "Tủ lạnh 2 cánh",
        ac: "Máy lạnh treo tường",
        glassdoor: "Cửa kính trượt ban công",
        tv: "Tivi treo tường",
        speaker: "Loa trụ đứng"
    },

    // Ánh xạ giữa thiết bị và Speech Card ID của nó
    deviceToLeftCard: {
        fan: "L1",
        ac: "L2",
        light: "L3",
        fridge: "L4",
        glassdoor: "L5",
        vacuum: "L6",
        tv: "L7",
        speaker: "L8"
    },

    // Dữ liệu câu nói / ngữ cảnh (Left Cards)
    leftCards: [
        { id: "L1", text: "Bật quạt", icon: "💨" },
        { id: "L2", text: "Bật máy lạnh", icon: "☀️" },
        { id: "L3", text: "Bật đèn", icon: "🌙" },
        { id: "L4", text: "Mở tủ lạnh", icon: "🍎" },
        { id: "L5", text: "Mở cửa kính", icon: "🚪" },
        { id: "L6", text: "Bật robot hút bụi", icon: "🧹" },
        { id: "L7", text: "Bật tivi", icon: "📺" },
        { id: "L8", text: "Bật loa", icon: "🎵" }
    ],

    // Dữ liệu chức năng hành động (Right Cards)
    rightCards: [
        { id: "R1", actionKey: "fan_on", text: "Bật/Tắt quạt đứng", desc: "Quạt đứng xoay tít" },
        { id: "R2", actionKey: "ac_on", text: "Bật/Tắt máy lạnh", desc: "Máy lạnh phả gió lạnh" },
        { id: "R3", actionKey: "light_on", text: "Bật/Tắt đèn LED", desc: "Hai đèn LED áp tường chiếu sáng" },
        { id: "R4", actionKey: "fridge_open", text: "Mở/Đóng tủ lạnh", desc: "Mở tủ lạnh phát sáng thực phẩm" },
        { id: "R5", actionKey: "glassdoor_open", text: "Mở/Đóng cửa kính", desc: "Cửa kính tự động trượt ra" },
        { id: "R6", actionKey: "vacuum_on", text: "Kích hoạt robot hút bụi", desc: "Robot tự trượt đi dọn dẹp" },
        { id: "R7", actionKey: "tv_on", text: "Bật/Tắt tivi", desc: "Tivi chiếu phim hoạt hình" },
        { id: "R8", actionKey: "speaker_on", text: "Bật/Tắt loa đứng", desc: "Loa phát nhạc, nốt bay" }
    ],

    // Bộ não liên kết đã lập trình: { leftCardId: rightCardId }
    connections: {}
};

// --- 3. ĐIỀU KHIỂN LOGIC CHƯƠNG TRÌNH ---
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    currentScreen: 'intro',
    selectedDevice: null,
    fridgeTimer: null,

    init() {
        this.bindGlobalEvents();
        this.setupRoomInteractions();
        this.updateDashboardUI();
        this.renderCustomRulesTable();
    },

    showScreen(screenId) {
        SoundManager.playSwoosh();
        
        // Ẩn tất cả các màn hình
        document.querySelectorAll('.screen-container').forEach(screen => {
            screen.classList.remove('active');
        });

        // Hiển thị màn hình tương ứng
        const targetScreen = document.getElementById(`${screenId}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }

        // Cập nhật indicators
        const step2 = document.getElementById('step-indicator-2');
        if (step2) {
            if (screenId === 'testing') {
                step2.classList.add('completed');
            } else {
                step2.classList.remove('completed');
            }
        }
    },

    bindGlobalEvents() {
        // Gõ cửa vào nhà ở màn hình Intro -> Chuyển thẳng sang Giai đoạn 2 Lập trình
        document.getElementById('svg-front-door').addEventListener('click', () => {
            SoundManager.playChime();
            const door = document.getElementById('svg-front-door');
            door.style.filter = "drop-shadow(0 0 30px #ffffff)";
            
            setTimeout(() => {
                door.style.filter = "";
                this.showScreen('phase2');
            }, 600);
        });

        // Chơi lại từ đầu
        document.getElementById('btn-restart-app').addEventListener('click', () => {
            if (confirm("Bạn có muốn chơi lại game từ đầu không?")) {
                this.resetWholeGame();
            }
        });

        // Bật/tắt âm thanh
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

        // Nút tròn "+" hiển thị dropdown menu gán lệnh
        const btnPlus = document.getElementById('btn-assign-plus');
        const dropdownMenu = document.getElementById('assign-dropdown-menu');
        
        btnPlus.addEventListener('click', (e) => {
            e.stopPropagation();
            SoundManager.playBeep(650, 0.08);
            dropdownMenu.classList.toggle('show');
        });

        // Đóng dropdown khi click bên ngoài
        document.addEventListener('click', () => {
            if (dropdownMenu) dropdownMenu.classList.remove('show');
        });

        // Lựa chọn chức năng từ dropdown menu để gán cho thiết bị
        document.querySelectorAll('.dropdown-item-action').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.remove('show');
                const actionKey = item.getAttribute('data-action');
                this.assignActionToDevice(actionKey);
            });
        });

        // Nút Lưu Lập trình
        document.getElementById('btn-save-programming').addEventListener('click', () => {
            SoundManager.playSuccess();
            alert("Đã lưu trữ toàn bộ kịch bản thiết lập của bạn thành công! Hãy sẵn sàng để Kiểm Tra thử nhé!");
        });

        // Nút Kiểm Tra -> Chuyển sang bước Test thử
        document.getElementById('btn-submit-programming').addEventListener('click', () => {
            const keysCount = Object.keys(GameData.connections).length;
            if (keysCount === 0) {
                alert("Bạn chưa lập trình gán lệnh cho thiết bị nào cả! Hãy chọn thiết bị và gán ít nhất một liên kết nhé!");
                SoundManager.playBeep(350, 0.2, 'sawtooth');
                return;
            }
            this.switchToTestingPhase();
        });

        // Nút Quay lại lập trình từ bước Test
        document.getElementById('btn-back-to-programming').addEventListener('click', () => {
            // Trả SVG căn phòng về container lập trình
            this.migrateRoomSVG('inner-room-container-program');
            
            // Đồng bộ lại UI chọn thiết bị
            this.resetSelection();
            
            this.showScreen('phase2');
        });

        // Nút hoàn thành cuối cùng ăn mừng
        document.getElementById('btn-finish-celebration').addEventListener('click', () => {
            SoundManager.playSuccess();
            document.getElementById('modal-congrats-celebration').classList.add('active');
        });

        document.getElementById('btn-restart-from-congrats').addEventListener('click', () => {
            document.getElementById('modal-congrats-celebration').classList.remove('active');
            this.resetWholeGame();
        });
    },

    setupRoomInteractions() {
        // Thiết lập sự kiện hover và click cho các thiết bị SVG
        for (let dev in GameData.deviceNames) {
            const devEl = document.getElementById(`device-${dev}`);
            if (!devEl) continue;

            // Rê chuột vào thiết bị
            devEl.addEventListener('mouseenter', (e) => {
                if (this.currentScreen !== 'phase2' && this.currentScreen !== 'testing') return;
                
                devEl.classList.add('device-focused');
                
                // Hiển thị bong bóng tooltip
                const tooltipId = this.currentScreen === 'phase2' ? 'program-device-tooltip' : 'test-device-tooltip';
                const tooltip = document.getElementById(tooltipId);
                if (tooltip) {
                    tooltip.innerText = GameData.deviceNames[dev];
                    tooltip.classList.add('show');
                    this.positionTooltip(devEl, tooltip);
                }
            });

            // Di chuyển chuột cập nhật vị trí tooltip nhẹ nhàng
            devEl.addEventListener('mousemove', (e) => {
                if (this.currentScreen !== 'phase2' && this.currentScreen !== 'testing') return;
                const tooltipId = this.currentScreen === 'phase2' ? 'program-device-tooltip' : 'test-device-tooltip';
                const tooltip = document.getElementById(tooltipId);
                if (tooltip && tooltip.classList.contains('show')) {
                    this.positionTooltip(devEl, tooltip);
                }
            });

            // Rời chuột
            devEl.addEventListener('mouseleave', () => {
                devEl.classList.remove('device-focused');
                const tooltipId = this.currentScreen === 'phase2' ? 'program-device-tooltip' : 'test-device-tooltip';
                const tooltip = document.getElementById(tooltipId);
                if (tooltip) {
                    tooltip.classList.remove('show');
                }
            });

            // Nhấp chọn thiết bị
            devEl.addEventListener('click', () => {
                if (this.currentScreen === 'phase2') {
                    // Chế độ Lập trình
                    this.selectDeviceForProgramming(dev);
                } else if (this.currentScreen === 'testing') {
                    // Chế độ Thử nghiệm
                    this.triggerTestDeviceClick(dev);
                }
            });
        }
    },

    positionTooltip(element, tooltip) {
        const rect = element.getBoundingClientRect();
        const container = element.closest('.room-viewport').getBoundingClientRect();
        
        const top = (rect.top - container.top);
        const left = (rect.left - container.left) + rect.width / 2;
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    },

    selectDeviceForProgramming(devName) {
        // Gỡ bỏ class chọn cũ
        for (let dev in GameData.deviceNames) {
            const el = document.getElementById(`device-${dev}`);
            if (el) el.classList.remove('device-selected');
        }

        // Chọn thiết bị mới
        this.selectedDevice = devName;
        const activeEl = document.getElementById(`device-${devName}`);
        if (activeEl) activeEl.classList.add('device-selected');

        SoundManager.playBeep(700, 0.08);

        // Hiển thị nút "+" tròn và ẩn checkmark cũ
        document.getElementById('btn-assign-plus').style.display = 'flex';
        document.getElementById('checkmark-success').style.display = 'none';

        // Cập nhật badge & speech của LUNA
        document.getElementById('program-device-status-badge').innerText = `Đang chọn: ${GameData.deviceNames[devName]} ⚙️`;
        
        const currentMappedActionId = GameData.connections[GameData.deviceToLeftCard[devName]];
        let statusText = "";
        if (currentMappedActionId) {
            const act = GameData.rightCards.find(c => c.id === currentMappedActionId);
            statusText = `Bạn đã từng gán cho **${GameData.deviceNames[devName]}** chức năng: *"${act.text}"*. Bấm nút tròn "+" để thay đổi hoặc chọn chức năng mới tinh nhé!`;
        } else {
            statusText = `LUNA: Bạn đang nhấp chọn **${GameData.deviceNames[devName]}**. Hãy ấn vào nút tròn "+" màu xanh lá bên dưới để dạy tôi gán chức năng cho đồ vật này!`;
        }
        document.getElementById('luna-speech-text').innerText = statusText;
    },

    assignActionToDevice(actionKey) {
        if (!this.selectedDevice) return;

        const leftCardId = GameData.deviceToLeftCard[this.selectedDevice];
        const rightCard = GameData.rightCards.find(c => c.actionKey === actionKey);
        
        if (!rightCard) return;

        // Lưu thiết lập kịch bản nối vào connections
        GameData.connections[leftCardId] = rightCard.id;

        // Cập nhật bảng kịch bản trực quan ở cột trái thời gian thực
        this.renderCustomRulesTable();

        // Bắn tiếng chuông nhẹ & Chạy hiệu ứng dấu Tick
        SoundManager.playSuccess();
        
        const plusBtn = document.getElementById('btn-assign-plus');
        const checkmark = document.getElementById('checkmark-success');
        
        plusBtn.style.display = 'none';
        checkmark.style.display = 'flex';

        // Hiển thị bóng thoại của LUNA
        const responseText = `Thành công! 🌟 Tôi đã ghi nhớ bài học: Khi nghe khẩu lệnh tương ứng thì sẽ: *"${rightCard.text}"* cho thiết bị **${GameData.deviceNames[this.selectedDevice]}**!`;
        document.getElementById('luna-speech-text').innerText = responseText;

        // Biến mất dấu tick sau 1.8 giây và chờ chọn đồ vật tiếp theo
        setTimeout(() => {
            if (this.selectedDevice) {
                checkmark.style.display = 'none';
                document.getElementById('luna-speech-text').innerText = `LUNA: Đã hoàn tất gán lệnh! Hãy nhấp tiếp vào các đồ vật khác trong căn phòng để lập trình tiếp nhé!`;
                // Gỡ trạng thái chọn để học sinh ấn đồ vật tiếp theo
                this.resetSelection();
            }
        }, 1800);
    },

    resetSelection() {
        this.selectedDevice = null;
        for (let dev in GameData.deviceNames) {
            const el = document.getElementById(`device-${dev}`);
            if (el) el.classList.remove('device-selected');
        }
        document.getElementById('btn-assign-plus').style.display = 'none';
        document.getElementById('checkmark-success').style.display = 'none';
        document.getElementById('program-device-status-badge').innerText = "Đang chọn thiết bị... 🧠";
    },

    migrateRoomSVG(targetContainerId) {
        const svg = document.querySelector('.inner-room-svg');
        const targetContainer = document.getElementById(targetContainerId);
        if (svg && targetContainer) {
            targetContainer.appendChild(svg);
        }
    },

    switchToTestingPhase() {
        // Di chuyển căn phòng SVG sang khung của Giai đoạn Test
        this.migrateRoomSVG('inner-room-container-test');

        // Tắt hết tất cả thiết bị đang chạy về OFF để bắt đầu test
        for (let dev in GameData.deviceStates) {
            this.toggleDevice(dev, false);
        }

        // Dựng danh sách các nút câu nói kích hoạt nhanh
        this.renderTestCommandsGrid();

        // Cập nhật bảng kịch bản cho bước Test
        this.renderCustomRulesTable();

        // Chuyển sang màn hình Test
        this.showScreen('testing');
    },

    renderTestCommandsGrid() {
        const container = document.getElementById('test-quick-commands-container');
        container.innerHTML = '';
        container.style.cssText = "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; background: rgba(15, 23, 42, 0.03); border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 16px; padding: 1rem; width: 100%;";

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            // 1. RENDER MICROPHONE UI
            const statusDiv = document.createElement('div');
            statusDiv.id = 'mic-status-text';
            statusDiv.style.cssText = "font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-align: center; min-height: 24px; transition: all 0.3s ease;";
            statusDiv.innerText = "Nhấn nút Mic bên dưới và nói câu lệnh để kiểm tra... 🎙️";
            container.appendChild(statusDiv);

            const micBtn = document.createElement('button');
            micBtn.type = 'button';
            micBtn.className = 'btn-mic-trigger btn-mic-round';
            micBtn.style.cssText = "width: 56px; height: 56px; border-radius: 50%; background: var(--grad-primary); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-cyan); position: relative;";
            micBtn.innerHTML = `
                <svg id="mic-icon-svg" style="width: 22px; height: 22px; fill: white;" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
                <div class="mic-pulse-ring" id="mic-pulse-ring-element" style="display: none; width: 56px; height: 56px;"></div>
            `;
            container.appendChild(micBtn);

            // Setup Speech Recognition
            const recognition = new SpeechRecognition();
            recognition.lang = 'vi-VN';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            let isListening = false;

            const stopListeningVisuals = () => {
                isListening = false;
                micBtn.classList.remove('recording');
                const pulseRing = micBtn.querySelector('#mic-pulse-ring-element');
                if (pulseRing) pulseRing.style.display = 'none';
                statusDiv.style.color = 'var(--text-muted)';
            };

            micBtn.addEventListener('click', () => {
                if (isListening) {
                    recognition.stop();
                } else {
                    try {
                        recognition.start();
                        isListening = true;
                        micBtn.classList.add('recording');
                        const pulseRing = micBtn.querySelector('#mic-pulse-ring-element');
                        if (pulseRing) pulseRing.style.display = 'block';
                        statusDiv.innerText = "LUNA đang lắng nghe bạn nói... 🎙️";
                        statusDiv.style.color = 'var(--neon-green)';
                    } catch (err) {
                        console.error("Speech error", err);
                    }
                }
            });

            recognition.onresult = (event) => {
                stopListeningVisuals();
                const spoken = event.results[0][0].transcript;
                statusDiv.innerHTML = `Bạn vừa nói: <span style="color: var(--neon-cyan)">"${spoken}"</span>`;

                const matchedLeftId = this.findMatchingLeftId(spoken);
                if (matchedLeftId) {
                    this.executeTestSpeechCommand(matchedLeftId, spoken);
                } else {
                    SoundManager.playError();
                    const reply = `🤖 LUNA: Tôi nghe thấy câu nói "${spoken}", nhưng kịch bản bạn lập trình chưa gán câu này cho thiết bị nào cả. Hãy thử nói câu khác nhé!`;
                    document.getElementById('test-luna-speech-text').innerText = reply;
                }
            };

            recognition.onerror = (event) => {
                stopListeningVisuals();
                if (event.error === 'no-speech') {
                    statusDiv.innerText = "Không nghe thấy tiếng nói. Hãy thử lại! 🎙️";
                } else {
                    statusDiv.innerText = "Lỗi mic. Vui lòng cho phép quyền truy cập mic! ⚠️";
                }
            };

            recognition.onend = () => {
                stopListeningVisuals();
            };

        } else {
            // 2. FALLBACK INPUT TEXT UI FOR UNSUPPORTED BROWSERS
            const titleLabel = document.createElement('div');
            titleLabel.style.cssText = "font-size: 0.82rem; font-weight: 700; color: var(--text-muted); width: 100%; text-align: left;";
            titleLabel.innerText = "Nhập câu lệnh để kiểm tra bộ não AI:";
            container.appendChild(titleLabel);

            const inputContainer = document.createElement('div');
            inputContainer.className = 'fallback-input-container';
            inputContainer.style.cssText = "display: flex; gap: 0.5rem; width: 100%;";

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'fallback-text-input';
            textInput.placeholder = 'Ví dụ: Bật quạt, Tắt tivi, Nóng quá...';
            textInput.style.cssText = "flex: 1; border: 1px solid var(--border-glass); border-radius: 12px; padding: 0.5rem 0.75rem; font-size: 0.82rem; outline: none; background: rgba(255,255,255,0.9);";
            inputContainer.appendChild(textInput);

            const sendBtn = document.createElement('button');
            sendBtn.type = 'button';
            sendBtn.className = 'fallback-send-btn';
            sendBtn.innerText = "Gửi 🚀";
            sendBtn.style.cssText = "background: var(--grad-primary); border: none; color: white; border-radius: 12px; padding: 0 1rem; font-weight: 700; font-size: 0.82rem; cursor: pointer;";
            inputContainer.appendChild(sendBtn);

            container.appendChild(inputContainer);

            const triggerTextCommand = () => {
                const text = textInput.value.trim();
                if (!text) return;
                textInput.value = '';

                const matchedLeftId = this.findMatchingLeftId(text);
                if (matchedLeftId) {
                    this.executeTestSpeechCommand(matchedLeftId, text);
                } else {
                    SoundManager.playError();
                    const reply = `🤖 LUNA: Tôi nhận được câu lệnh "${text}", nhưng kịch bản bạn lập trình chưa gán câu này cho thiết bị nào cả. Hãy thử nhập câu khác nhé!`;
                    document.getElementById('test-luna-speech-text').innerText = reply;
                }
            };

            sendBtn.addEventListener('click', triggerTextCommand);
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') triggerTextCommand();
            });
        }
    },

    findMatchingLeftId(spokenText) {
        if (!spokenText) return null;
        const cleanedSpoken = spokenText.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
        
        let bestLeftId = null;
        let maxMatchScore = 0;

        for (let leftId in GameData.connections) {
            const leftCard = GameData.leftCards.find(c => c.id === leftId);
            if (!leftCard) continue;

            const cleanedRule = leftCard.text.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");

            // 1. Khớp tuyệt đối hoặc chứa cụm từ
            if (cleanedSpoken.includes(cleanedRule) || cleanedRule.includes(cleanedSpoken)) {
                return leftId;
            }

            // 2. So khớp tương đồng từ vựng (Word overlap)
            const spokenWords = cleanedSpoken.split(/\s+/);
            const ruleWords = cleanedRule.split(/\s+/);
            const intersection = spokenWords.filter(w => ruleWords.includes(w));
            
            const score = intersection.length / Math.max(spokenWords.length, ruleWords.length);
            if (score > 0.4 && score > maxMatchScore) {
                maxMatchScore = score;
                bestLeftId = leftId;
            }
        }
        return bestLeftId;
    },

    renderCustomRulesTable() {
        const tbodyTest = document.getElementById('custom-rules-table-body');
        const tbodyProg = document.getElementById('program-rules-table-body');
        
        const generateRowsHtml = () => {
            let html = "";
            let count = 0;
            for (let leftId in GameData.connections) {
                const rightId = GameData.connections[leftId];
                const leftCard = GameData.leftCards.find(c => c.id === leftId);
                const rightCard = GameData.rightCards.find(c => c.id === rightId);

                if (leftCard && rightCard) {
                    count++;
                    html += `
                        <div class="rule-item-row" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.95); padding: 0.55rem 0.8rem; border-radius: 10px; border: 1px solid var(--border-glass); font-size: 0.82rem; font-weight: 700; gap: 0.5rem; width: 100%;">
                            <span class="rule-item-speech" style="color: var(--neon-cyan); max-width: 45%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block;">"${leftCard.text}"</span>
                            <span class="rule-item-arrow-icon" style="color: var(--text-muted); font-size: 0.75rem; font-weight: 800;">&gt;&gt;</span>
                            <span class="rule-item-action" style="color: var(--neon-purple); max-width: 45%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block;">${rightCard.text}</span>
                        </div>
                    `;
                }
            }
            if (count === 0) {
                html = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 0.75rem;">Chưa có thiết bị nào được lập trình.</div>`;
            }
            return html;
        };

        const html = generateRowsHtml();
        if (tbodyTest) tbodyTest.innerHTML = html;
        if (tbodyProg) tbodyProg.innerHTML = html;
    },

    executeTestSpeechCommand(leftId, utteranceText) {
        const rightId = GameData.connections[leftId];
        const rightCard = GameData.rightCards.find(c => c.id === rightId);

        if (!rightCard) return;

        const actionKey = rightCard.actionKey;
        const devName = this.getDeviceFromActionKey(actionKey);
        const targetState = !GameData.deviceStates[devName];

        SoundManager.playSuccess();
        this.toggleDevice(devName, targetState);

        let runExplanation = "";
        if (targetState) {
            if (actionKey === 'fan_on') runExplanation = "tôi đã cho xoay cánh quạt đứng.";
            else if (actionKey === 'ac_on') runExplanation = "tôi đã bật máy lạnh phả sóng gió mát lạnh.";
            else if (actionKey === 'light_on') runExplanation = "tôi đã thắp sáng đèn LED áp tường.";
            else if (actionKey === 'fridge_open') runExplanation = "tôi đã mở tủ lạnh chiếu sáng thức ăn.";
            else if (actionKey === 'glassdoor_open') runExplanation = "tôi đã trượt mở cửa kính ban công.";
            else if (actionKey === 'vacuum_on') runExplanation = "tôi đã kích hoạt robot hút bụi tự chạy.";
            else if (actionKey === 'tv_on') runExplanation = "tivi treo tường đã được mở.";
            else if (actionKey === 'speaker_on') runExplanation = "tôi đã khởi động loa phát nhạc nốt bay.";
        } else {
            if (actionKey === 'fan_on') runExplanation = "tôi đã tắt cánh quạt.";
            else if (actionKey === 'ac_on') runExplanation = "tôi đã tắt máy lạnh.";
            else if (actionKey === 'light_on') runExplanation = "tôi đã tắt đèn LED.";
            else if (actionKey === 'fridge_open') runExplanation = "tôi đã đóng khít tủ lạnh.";
            else if (actionKey === 'glassdoor_open') runExplanation = "tôi đã đóng kín cửa kính.";
            else if (actionKey === 'vacuum_on') runExplanation = "tôi đã dừng robot hút bụi.";
            else if (actionKey === 'tv_on') runExplanation = "tôi đã tắt tivi.";
            else if (actionKey === 'speaker_on') runExplanation = "tôi đã dừng phát nhạc của loa.";
        }

        // Tìm thiết bị gốc ứng với LeftId
        let originDev = "";
        for (let dev in GameData.deviceToLeftCard) {
            if (GameData.deviceToLeftCard[dev] === leftId) {
                originDev = dev;
                break;
            }
        }

        // Kiểm tra xem học sinh có lập trình logic chuẩn mực 1-1 thông thường không
        const isStandardMatch = (devName === originDev);
        let robotResponse = "";
        
        if (isStandardMatch) {
            robotResponse = `🤖 LUNA Master: Nhận tín hiệu câu nói "${utteranceText}". Thực thi hành động: ${runExplanation}. Bạn đã dạy tôi bài học logic vô cùng chính xác!`;
        } else {
            robotResponse = `🤪 LUNA sáng tạo: Bạn đã dạy tôi rằng khi nghe câu "${utteranceText}" thì tôi phải: ${runExplanation}. Tôi thực hiện chính xác những gì được huấn luyện đó! Sáng tạo hết nấc!`;
        }

        document.getElementById('test-luna-speech-text').innerText = robotResponse;
    },

    triggerTestDeviceClick(devName) {
        // Khi người dùng click trực tiếp vào thiết bị ở chế độ test:
        // Kích hoạt khẩu lệnh đã lập trình cho thiết bị đó!
        const leftId = GameData.deviceToLeftCard[devName];
        const rightId = GameData.connections[leftId];

        if (rightId) {
            const leftCard = GameData.leftCards.find(c => c.id === leftId);
            this.executeTestSpeechCommand(leftId, leftCard.text);
        } else {
            // Thiết bị này chưa được lập trình
            SoundManager.playBeep(350, 0.12, 'sawtooth');
            document.getElementById('test-luna-speech-text').innerText = `LUNA: Thiết bị **${GameData.deviceNames[devName]}** chưa được bạn lập trình bất cứ câu lệnh nào cả! Hãy ấn nút "Quay lại" để cấu hình gán lệnh nhé!`;
        }
    },

    getDeviceFromActionKey(actionKey) {
        switch (actionKey) {
            case 'fan_on': return 'fan';
            case 'ac_on': return 'ac';
            case 'light_on': return 'light';
            case 'fridge_open': return 'fridge';
            case 'glassdoor_open': return 'glassdoor';
            case 'vacuum_on': return 'vacuum';
            case 'tv_on': return 'tv';
            case 'speaker_on': return 'speaker';
            default: return '';
        }
    },

    toggleDevice(devName, forceState) {
        const targetState = forceState !== undefined ? forceState : !GameData.deviceStates[devName];
        GameData.deviceStates[devName] = targetState;

        // Thêm bớt CSS Class của SVG
        const element = document.getElementById(`device-${devName}`);
        if (element) {
            if (targetState) {
                element.classList.add(`device-${devName}-on`);
            } else {
                element.classList.remove(`device-${devName}-on`);
            }
        }

        // Tối/sáng phòng
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

        // Máy lạnh
        if (devName === 'ac' && targetState) {
            GameData.dashboardMetrics.temp = 24;
        } else if (devName === 'ac' && !targetState) {
            GameData.dashboardMetrics.temp = 30;
        }

        // Hút bụi
        if (devName === 'vacuum') {
            GameData.dashboardMetrics.air = targetState ? "Tuyệt vời (Sạch)" : "Ngột ngạt";
        }

        // Loa đứng
        if (devName === 'speaker') {
            if (targetState) {
                SoundManager.startRoyaltyFreeMusic();
            } else {
                SoundManager.stopRoyaltyFreeMusic();
            }
        }

        // Tivi
        if (devName === 'tv') {
            const tvVideo = document.getElementById('tvVideo');
            if (tvVideo) {
                if (targetState) {
                    tvVideo.loop = true;
                    tvVideo.muted = false;
                    tvVideo.volume = 0.5;
                    tvVideo.play().catch(e => {
                        tvVideo.muted = true;
                        tvVideo.play().catch(err => console.log("Muted tv play fail: ", err));
                    });
                } else {
                    tvVideo.pause();
                    tvVideo.currentTime = 0;
                }
            }
        }

        // Tủ lạnh
        if (devName === 'fridge') {
            if (this.fridgeTimer) {
                clearTimeout(this.fridgeTimer);
                this.fridgeTimer = null;
            }

            if (targetState) {
                this.fridgeTimer = setTimeout(() => {
                    this.toggleDevice('fridge', false);
                    SoundManager.playBeep(880, 0.12, 'sawtooth');
                    setTimeout(() => SoundManager.playBeep(880, 0.12, 'sawtooth'), 180);
                    
                    const alertMsg = "Trợ Lý LUNA: Cảnh báo 🚨! Cửa tủ lạnh đã mở quá 5 giây. Tôi đã tự động đóng khít để tiết kiệm điện.";
                    if (this.currentScreen === 'testing') {
                        document.getElementById('test-luna-speech-text').innerText = alertMsg;
                    }
                }, 5000);
            }
        }

        this.updateDashboardUI();
    },

    updateDashboardUI() {
        const temp = document.getElementById('dash-temp');
        const air = document.getElementById('dash-air');
        const lock = document.getElementById('dash-lock');
        
        if (temp) temp.textContent = GameData.dashboardMetrics.temp;
        if (air) {
            air.textContent = GameData.dashboardMetrics.air;
            air.style.fill = GameData.dashboardMetrics.air === "Ngột ngạt" ? "var(--neon-pink)" : "var(--neon-green)";
        }
        if (lock) {
            lock.textContent = GameData.dashboardMetrics.lock;
            lock.style.fill = GameData.dashboardMetrics.lock === "ĐANG KHÓA" ? "var(--neon-pink)" : "var(--neon-green)";
        }
    },

    resetWholeGame() {
        SoundManager.playChime();
        GameData.connections = {};
        for (let dev in GameData.deviceStates) {
            this.toggleDevice(dev, false);
        }
        this.resetSelection();
        this.migrateRoomSVG('inner-room-container-program');
        this.showScreen('intro');
    }
};
