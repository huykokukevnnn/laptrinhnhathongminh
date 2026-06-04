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
        temp: 28,
        air: "Trong lành",
        lock: "ĐANG KHÓA",
        speaker: "ĐANG TẮT"
    },

    // Tiếng Việt hiển thị tên các đồ vật
    deviceNames: {
        fan: "Quạt đứng",
        light: "Đèn LED áp tường",
        vacuum: "Robot hút bụi",
        fridge: "Tủ lạnh",
        ac: "Máy lạnh",
        glassdoor: "Cửa kính",
        tv: "Tivi",
        speaker: "Loa đứng"
    },

    // Cơ sở dữ liệu thiết bị với câu lệnh và hành động tương ứng
    deviceRulesConfig: {
        fan: {
            name: "Quạt đứng",
            commands: ["Trời nóng quá", "Trời lạnh quá", "Bật quạt", "Tắt quạt"],
            actions: [
                { key: "fan_on", text: "Mở quạt" },
                { key: "fan_off", text: "Tắt quạt" }
            ]
        },
        ac: {
            name: "Máy lạnh",
            commands: ["Trời nóng quá", "Trời lạnh quá", "Bật máy lạnh", "Tắt máy lạnh"],
            actions: [
                { key: "ac_on", text: "Mở máy lạnh" },
                { key: "ac_off", text: "Tắt máy lạnh" }
            ]
        },
        tv: {
            name: "Tivi",
            commands: ["Tôi muốn xem phim", "Tôi không muốn xem phim nữa", "Bật tivi", "Tắt tivi"],
            actions: [
                { key: "tv_on", text: "Mở tivi" },
                { key: "tv_off", text: "Tắt tivi" }
            ]
        },
        fridge: {
            name: "Tủ lạnh",
            commands: ["Tôi đói bụng", "Mở tủ lạnh", "Đóng tủ lạnh"],
            actions: [
                { key: "fridge_open", text: "Mở cửa tủ lạnh" },
                { key: "fridge_close", text: "Đóng cửa tủ lạnh" }
            ]
        },
        speaker: {
            name: "Loa đứng",
            commands: ["Tôi thấy yên tĩnh quá", "Tôi muốn nghe nhạc", "Bật loa", "Tắt loa"],
            actions: [
                { key: "speaker_on", text: "Mở loa" },
                { key: "speaker_off", text: "Tắt loa" }
            ]
        },
        vacuum: {
            name: "Robot hút bụi",
            commands: ["Nhà dơ quá", "Nhà sạch rồi", "Bật robot hút bụi", "Tắt robot hút bụi"],
            actions: [
                { key: "vacuum_on", text: "Mở robot hút bụi" },
                { key: "vacuum_off", text: "Tắt robot hút bụi" }
            ]
        },
        light: {
            name: "Đèn LED",
            commands: ["Trời tối rồi", "Tôi không thấy đường", "Bật đèn", "Tắt đèn"],
            actions: [
                { key: "light_on", text: "Mở đèn" },
                { key: "light_off", text: "Tắt đèn" }
            ]
        },
        glassdoor: {
            name: "Cửa kính",
            commands: ["Mở cửa kính", "Đóng cửa kính"],
            actions: [
                { key: "glassdoor_open", text: "Mở cửa kính" },
                { key: "glassdoor_close", text: "Đóng cửa kính" }
            ]
        }
    },

    // Bộ não liên kết đã lập trình: danh sách các quy tắc [{ device, command, actionKey }]
    connections: [],
    timeCycle: 'day',
    cycleSeconds: 0,
    currentTemp: 28,
    trashInRoom: [],
    vacuumPos: { x: 200, y: 385 }
};

// --- 3. ĐIỀU KHIỂN LOGIC CHƯƠNG TRÌNH ---
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    currentScreen: 'intro',
    selectedDevice: null,
    fridgeTimer: null,
    timeCycleInterval: null,
    vacuumReturnTimer: null,
    isVacuumCleaning: false,

    init() {
        this.bindGlobalEvents();
        this.setupRoomInteractions();
        this.updateDashboardUI();
        this.renderRulesEditor();
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

        // Nút thêm quy tắc lập trình dòng mới "+"
        const btnAddRule = document.getElementById('btn-add-rule-row');
        if (btnAddRule) {
            btnAddRule.addEventListener('click', () => {
                this.addNewRuleRow();
            });
        }

        // Nút Lưu Lập trình
        document.getElementById('btn-save-programming').addEventListener('click', () => {
            SoundManager.playSuccess();
            alert("Đã lưu trữ toàn bộ kịch bản thiết lập của bạn thành công! Hãy sẵn sàng để Kiểm Tra thử nhé!");
        });

        // Nút Kiểm Tra -> Chuyển sang bước Test thử
        document.getElementById('btn-submit-programming').addEventListener('click', () => {
            const validRules = GameData.connections.filter(r => r.device && r.command && r.actionKey);
            if (validRules.length === 0) {
                alert("Bạn chưa lập trình hoàn thành quy tắc nào cả! Hãy điền đủ thông tin thiết bị, câu lệnh và hành động nhé!");
                SoundManager.playBeep(350, 0.2, 'sawtooth');
                return;
            }
            this.switchToTestingPhase();
        });

        // Nút Quay lại lập trình từ bước Test
        document.getElementById('btn-back-to-programming').addEventListener('click', () => {
            // Dừng vòng lặp sáng tối khi không ở màn hình test
            if (this.timeCycleInterval) {
                clearInterval(this.timeCycleInterval);
                this.timeCycleInterval = null;
            }

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
        // Tự động tạo hàng quy tắc mới với thiết bị được chọn sẵn
        this.addNewRuleRow(devName);

        // Cập nhật badge & speech của LUNA
        document.getElementById('program-device-status-badge').innerText = `Đang chọn: ${GameData.deviceNames[devName]} ⚙️`;
        
        const responseText = `LUNA: Tôi đã thêm một quy tắc "Nếu... Thì..." mới cho thiết bị **${GameData.deviceNames[devName]}**! Bạn hãy chọn câu lệnh và hành động của thiết bị đó ở bên phải nhé!`;
        document.getElementById('luna-speech-text').innerText = responseText;
    },

    addNewRuleRow(devKey = '') {
        GameData.connections.push({
            device: devKey,
            command: '',
            actionKey: ''
        });
        this.renderRulesEditor();
        SoundManager.playBeep(650, 0.08);

        // Tự động cuộn danh sách quy tắc xuống dưới cùng
        const container = document.getElementById('rules-editor-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    },

    renderRulesEditor() {
        const container = document.getElementById('rules-editor-container');
        if (!container) return;

        container.innerHTML = '';
        
        if (GameData.connections.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1.5rem 0;">Danh sách quy tắc trống. Hãy nhấn nút "+" để thêm quy tắc mới hoặc nhấp trực tiếp vào thiết bị trong phòng!</div>`;
            return;
        }

        GameData.connections.forEach((rule, index) => {
            const row = document.createElement('div');
            row.className = 'rules-editor-row';
            row.setAttribute('data-index', index);

            // 1. Label Nếu
            const cmdLabel = document.createElement('span');
            cmdLabel.className = 'rule-label';
            cmdLabel.innerText = 'Nếu';

            // 2. Select Thiết bị
            const devSelect = document.createElement('select');
            devSelect.className = 'rule-select rule-device-select';
            
            const devPlaceholder = document.createElement('option');
            devPlaceholder.value = '';
            devPlaceholder.text = 'Chọn thiết bị';
            devPlaceholder.disabled = true;
            devPlaceholder.selected = !rule.device;
            devSelect.appendChild(devPlaceholder);

            for (let devKey in GameData.deviceRulesConfig) {
                const opt = document.createElement('option');
                opt.value = devKey;
                opt.text = GameData.deviceRulesConfig[devKey].name;
                opt.selected = rule.device === devKey;
                devSelect.appendChild(opt);
            }

            // 3. Select Câu lệnh (Lọc theo thiết bị)
            const cmdSelect = document.createElement('select');
            cmdSelect.className = 'rule-select rule-command-select';
            cmdSelect.disabled = !rule.device;

            const cmdPlaceholder = document.createElement('option');
            cmdPlaceholder.value = '';
            cmdPlaceholder.text = 'Chọn câu lệnh';
            cmdPlaceholder.disabled = true;
            cmdPlaceholder.selected = !rule.command;
            cmdSelect.appendChild(cmdPlaceholder);

            if (rule.device) {
                const config = GameData.deviceRulesConfig[rule.device];
                config.commands.forEach(cmd => {
                    const opt = document.createElement('option');
                    opt.value = cmd;
                    opt.text = cmd;
                    opt.selected = rule.command === cmd;
                    cmdSelect.appendChild(opt);
                });
            }

            // 4. Label Thì
            const actLabel = document.createElement('span');
            actLabel.className = 'rule-label';
            actLabel.innerText = 'Thì';

            // 5. Select Hành động (Lọc theo thiết bị)
            const actSelect = document.createElement('select');
            actSelect.className = 'rule-select rule-action-select';
            actSelect.disabled = !rule.device;

            const actPlaceholder = document.createElement('option');
            actPlaceholder.value = '';
            actPlaceholder.text = 'Chọn hành động';
            actPlaceholder.disabled = true;
            actPlaceholder.selected = !rule.actionKey;
            actSelect.appendChild(actPlaceholder);

            if (rule.device) {
                const config = GameData.deviceRulesConfig[rule.device];
                config.actions.forEach(act => {
                    const opt = document.createElement('option');
                    opt.value = act.key;
                    opt.text = act.text;
                    opt.selected = rule.actionKey === act.key;
                    actSelect.appendChild(opt);
                });
            }

            // 6. Nút xóa hàng quy tắc
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn-delete-rule';
            deleteBtn.innerText = '❌';
            deleteBtn.title = 'Xóa quy tắc';

            // Gán sự kiện thay đổi dữ liệu
            devSelect.addEventListener('change', (e) => {
                const newDev = e.target.value;
                rule.device = newDev;
                rule.command = '';
                rule.actionKey = '';
                this.renderRulesEditor();
                SoundManager.playBeep(600, 0.08);
            });

            cmdSelect.addEventListener('change', (e) => {
                rule.command = e.target.value;
                SoundManager.playBeep(650, 0.08);
            });

            actSelect.addEventListener('change', (e) => {
                rule.actionKey = e.target.value;
                SoundManager.playBeep(700, 0.08);
            });

            deleteBtn.addEventListener('click', () => {
                GameData.connections.splice(index, 1);
                this.renderRulesEditor();
                SoundManager.playBeep(300, 0.15, 'sawtooth');
            });

            // Lắp ghép giao diện
            row.appendChild(cmdLabel);
            row.appendChild(devSelect);
            row.appendChild(cmdSelect);
            row.appendChild(actLabel);
            row.appendChild(actSelect);
            row.appendChild(deleteBtn);

            container.appendChild(row);
        });
    },

    resetSelection() {
        this.selectedDevice = null;
        for (let dev in GameData.deviceNames) {
            const el = document.getElementById(`device-${dev}`);
            if (el) el.classList.remove('device-selected');
        }
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

        // Tắt hết tất cả thiết bị đang chạy về OFF để bắt đầu test sạch
        for (let dev in GameData.deviceStates) {
            this.toggleDevice(dev, false);
        }

        // Tạo lại lớp rác sạch bóng
        GameData.trashInRoom = [];
        const trashLayer = document.getElementById('trash-layer');
        if (trashLayer) trashLayer.innerHTML = '';
        
        // Reset robot về dock sạc
        const vacuumEl = document.getElementById('device-vacuum');
        if (vacuumEl) {
            vacuumEl.style.transform = 'translate(0px, 0px)';
        }
        GameData.vacuumPos = { x: 200, y: 385 };
        this.isVacuumCleaning = false;
        if (this.vacuumReturnTimer) {
            clearTimeout(this.vacuumReturnTimer);
            this.vacuumReturnTimer = null;
        }

        // Gỡ bỏ các class bóng tối cũ
        const containers = document.querySelectorAll('.inner-room-container');
        containers.forEach(container => {
            container.classList.remove('night-time', 'transition-5s');
        });

        // Dựng danh sách các nút câu nói kích hoạt nhanh giọng nói
        this.renderTestCommandsGrid();

        // Kết xuất bảng tóm tắt luật đã lập trình ở cột phải màn hình test
        this.renderTestRulesSummary();

        // Kích hoạt chu kỳ sáng tối và nhiệt độ mô phỏng
        this.initTimeCycle();

        // Đăng ký sự kiện kéo thả rác
        this.initDragAndDrop();

        // Chuyển sang màn hình Test
        this.showScreen('testing');
    },

    renderTestRulesSummary() {
        const container = document.getElementById('test-rules-summary-container');
        if (!container) return;

        container.innerHTML = '';
        let count = 0;

        GameData.connections.forEach(rule => {
            if (rule.device && rule.command && rule.actionKey) {
                count++;
                const devConfig = GameData.deviceRulesConfig[rule.device];
                const actText = devConfig ? devConfig.actions.find(a => a.key === rule.actionKey)?.text || rule.actionKey : rule.actionKey;
                
                const item = document.createElement('div');
                item.className = 'rule-item-row';
                item.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.95); padding: 0.55rem 0.8rem; border-radius: 10px; border: 1px solid var(--border-glass); font-size: 0.82rem; font-weight: 700; gap: 0.5rem; width: 100%;";
                item.innerHTML = `
                    <span class="rule-item-speech" style="color: var(--neon-cyan); max-width: 45%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block;">"${rule.command}"</span>
                    <span class="rule-item-arrow-icon" style="color: var(--text-muted); font-size: 0.75rem; font-weight: 800;">&gt;&gt;</span>
                    <span class="rule-item-action" style="color: var(--neon-purple); max-width: 45%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block;">${actText}</span>
                `;
                container.appendChild(item);
            }
        });

        if (count === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 0.75rem;">Chưa có quy tắc nào hoàn chỉnh.</div>`;
        }
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

                const matchedRule = this.findMatchingRule(spoken);
                if (matchedRule) {
                    this.executeRule(matchedRule);
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
            textInput.placeholder = 'Ví dụ: Bật quạt, Bật đèn, Trời tối rồi, Trời nóng quá...';
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

                const matchedRule = this.findMatchingRule(text);
                if (matchedRule) {
                    this.executeRule(matchedRule);
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

    findMatchingRule(spokenText) {
        if (!spokenText) return null;
        const cleanedSpoken = spokenText.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
        
        let bestRule = null;
        let maxMatchScore = 0;

        for (let rule of GameData.connections) {
            if (!rule.device || !rule.command || !rule.actionKey) continue;

            const cleanedRule = rule.command.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");

            // 1. Khớp tuyệt đối hoặc chứa cụm từ
            if (cleanedSpoken.includes(cleanedRule) || cleanedRule.includes(cleanedSpoken)) {
                return rule;
            }

            // 2. So khớp tương đồng từ vựng (Word overlap)
            const spokenWords = cleanedSpoken.split(/\s+/);
            const ruleWords = cleanedRule.split(/\s+/);
            const intersection = spokenWords.filter(w => ruleWords.includes(w));
            
            const score = intersection.length / Math.max(spokenWords.length, ruleWords.length);
            if (score > 0.4 && score > maxMatchScore) {
                maxMatchScore = score;
                bestRule = rule;
            }
        }
        return bestRule;
    },

    executeRule(rule) {
        if (!rule) return;
        const actionKey = rule.actionKey;
        const devName = rule.device;
        const isOnAction = actionKey.endsWith('_on') || actionKey.endsWith('_open');

        SoundManager.playSuccess();
        this.toggleDevice(devName, isOnAction);

        const devNameVi = GameData.deviceNames[devName];
        const actionText = GameData.deviceRulesConfig[devName].actions.find(a => a.key === actionKey)?.text || actionKey;
        
        const reply = `🤖 LUNA: Thực thi quy tắc đã học: Nhận tín hiệu "${rule.command}" -> Thực hiện: "${actionText}" cho thiết bị **${devNameVi}**!`;
        document.getElementById('test-luna-speech-text').innerText = reply;
    },

    triggerTestDeviceClick(devName) {
        // Khi người dùng click trực tiếp vào thiết bị ở chế độ test:
        // Tìm quy tắc tương thích với thiết bị đó dựa theo trạng thái hiện tại
        const rules = GameData.connections.filter(r => r.device === devName && r.command && r.actionKey);
        
        if (rules.length > 0) {
            const currentState = GameData.deviceStates[devName];
            // Ưu tiên tìm quy tắc thực hiện chuyển đổi ngược trạng thái hiện tại
            let matchingRule = rules.find(r => {
                const isTurnOn = r.actionKey.endsWith('_on') || r.actionKey.endsWith('_open');
                return currentState ? !isTurnOn : isTurnOn;
            });
            if (!matchingRule) matchingRule = rules[0]; // fallback lấy quy tắc đầu tiên
            
            this.executeRule(matchingRule);
        } else {
            SoundManager.playBeep(350, 0.12, 'sawtooth');
            document.getElementById('test-luna-speech-text').innerText = `LUNA: Thiết bị **${GameData.deviceNames[devName]}** chưa được bạn lập trình bất cứ quy tắc nào cả! Hãy quay lại lập trình nhé!`;
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

        // Tối/sáng phòng theo nút Đèn
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

        // Máy lạnh tác động nhiệt độ hiển thị tức thời nếu thủ công
        if (devName === 'ac') {
            if (targetState) {
                GameData.dashboardMetrics.temp = 24;
                GameData.currentTemp = 24;
            } else {
                GameData.dashboardMetrics.temp = 30;
                GameData.currentTemp = 30;
            }
            this.updateTimeCycleUI();
        }

        // Robot hút bụi
        if (devName === 'vacuum') {
            GameData.dashboardMetrics.air = targetState ? "Tuyệt vời (Sạch)" : "Ngột ngạt";
            if (targetState) {
                // Tự động kiểm tra và hút rác nếu bật lên
                setTimeout(() => {
                    this.runVacuumCleaning();
                }, 400);
            } else {
                // Tắt robot: dừng tiến trình hút rác, trả về dock sạc
                if (this.vacuumReturnTimer) {
                    clearTimeout(this.vacuumReturnTimer);
                    this.vacuumReturnTimer = null;
                }
                this.isVacuumCleaning = false;
                const vacuumEl = document.getElementById('device-vacuum');
                if (vacuumEl) {
                    vacuumEl.style.transform = 'translate(0px, 0px)';
                }
                GameData.vacuumPos = { x: 200, y: 385 };
                
                const roomSvgs = document.querySelectorAll('.inner-room-svg');
                roomSvgs.forEach(svg => svg.classList.remove('vacuum-cleaning-active'));
            }
        }

        // Loa đứng phát âm thanh nốt nhạc bay
        if (devName === 'speaker') {
            if (targetState) {
                SoundManager.startRoyaltyFreeMusic();
            } else {
                SoundManager.stopRoyaltyFreeMusic();
            }
        }

        // Tivi phát video mp4
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

        // Tủ lạnh cảnh báo nếu mở quá lâu
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
        
        if (temp) temp.textContent = GameData.currentTemp || GameData.dashboardMetrics.temp;
        if (air) {
            air.textContent = GameData.dashboardMetrics.air;
            air.style.fill = GameData.dashboardMetrics.air === "Ngột ngạt" ? "var(--neon-pink)" : "var(--neon-green)";
        }
        if (lock) {
            lock.textContent = GameData.dashboardMetrics.lock;
            lock.style.fill = GameData.dashboardMetrics.lock === "ĐANG KHÓA" ? "var(--neon-pink)" : "var(--neon-green)";
        }
    },

    initTimeCycle() {
        if (this.timeCycleInterval) {
            clearInterval(this.timeCycleInterval);
        }

        GameData.timeCycle = 'day';
        GameData.cycleSeconds = 0;
        GameData.currentTemp = 28;

        this.updateTimeCycleUI();

        this.timeCycleInterval = setInterval(() => {
            if (this.currentScreen !== 'testing') return;

            GameData.cycleSeconds++;

            if (GameData.timeCycle === 'day') {
                // Nhiệt độ tăng dần từ 25 lên 32 khi trời sáng
                const progress = Math.min(1, GameData.cycleSeconds / 120);
                GameData.currentTemp = 25 + Math.round(7 * progress);

                // Tự động kiểm tra bật máy lạnh khi nhiệt độ chạm 32 độ C
                if (GameData.currentTemp === 32) {
                    this.checkAutomaticACRule();
                }

                if (GameData.cycleSeconds >= 120) {
                    GameData.timeCycle = 'night';
                    GameData.cycleSeconds = 0;
                    this.startNightTransition();
                }
            } else {
                // Nhiệt độ giảm dần từ 32 xuống 25 khi trời tối
                const progress = Math.min(1, GameData.cycleSeconds / 120);
                GameData.currentTemp = 32 - Math.round(7 * progress);

                if (GameData.cycleSeconds >= 120) {
                    GameData.timeCycle = 'day';
                    GameData.cycleSeconds = 0;
                    this.startDayTransition();
                }
            }

            this.updateTimeCycleUI();
        }, 1000);
    },

    updateTimeCycleUI() {
        const tempVals = document.querySelectorAll('.temp-val');
        tempVals.forEach(val => {
            val.innerText = GameData.currentTemp;
        });

        const cycleText = GameData.timeCycle === 'day' ? 'Trời Sáng' : 'Trời Tối';
        const cycleBadges = document.querySelectorAll('.light-cycle-badge');

        cycleBadges.forEach(badge => {
            const span = badge.querySelector('.cycle-text');
            if (span) span.innerText = cycleText;
            
            if (GameData.timeCycle === 'day') {
                badge.style.color = 'var(--neon-yellow)';
                badge.style.borderColor = 'rgba(202, 138, 4, 0.3)';
                badge.style.background = 'rgba(202, 138, 4, 0.08)';
                badge.innerHTML = `☀️ <span class="cycle-text">${cycleText}</span>`;
            } else {
                badge.style.color = 'var(--neon-purple)';
                badge.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                badge.style.background = 'rgba(168, 85, 247, 0.08)';
                badge.innerHTML = `🌙 <span class="cycle-text">${cycleText}</span>`;
            }
        });

        this.updateDashboardUI();
    },

    checkAutomaticACRule() {
        // Kiểm tra xem đã lập trình máy lạnh tự động mở khi trời nóng
        const acRule = GameData.connections.find(r => r.device === 'ac' && r.command === 'Trời nóng quá' && r.actionKey === 'ac_on');
        if (acRule) {
            this.executeRule(acRule);
            document.getElementById('test-luna-speech-text').innerText = "🤖 LUNA: Nhiệt độ ngoài trời tăng lên 32°C (Trời nóng quá)! Tôi tự động bật máy lạnh mát rượi.";
        }

        // Tương tự, kiểm tra xem có lập trình quạt mở khi trời nóng không
        const fanRule = GameData.connections.find(r => r.device === 'fan' && r.command === 'Trời nóng quá' && r.actionKey === 'fan_on');
        if (fanRule) {
            this.executeRule(fanRule);
            document.getElementById('test-luna-speech-text').innerText = "🤖 LUNA: Nhiệt độ ngoài trời tăng lên 32°C (Trời nóng quá)! Tôi tự động mở quạt đứng quay mát mẻ.";
        }
    },

    startNightTransition() {
        const containers = document.querySelectorAll('.inner-room-container');
        containers.forEach(container => {
            container.classList.add('night-time');
            container.classList.add('transition-5s');
        });

        document.getElementById('test-luna-speech-text').innerText = "🤖 LUNA: Chu kỳ chuyển giao tối hẳn 5 giây bắt đầu buông xuống...";

        setTimeout(() => {
            containers.forEach(container => {
                container.classList.remove('transition-5s');
            });

            // Tự động kiểm tra bật đèn khi trời tối hẳn
            const lightRule = GameData.connections.find(r => r.device === 'light' && r.command === 'Trời tối rồi' && r.actionKey === 'light_on');
            if (lightRule) {
                this.executeRule(lightRule);
                document.getElementById('test-luna-speech-text').innerText = "🤖 LUNA: Trời đã tối hẳn! Tôi tự động thắp sáng đèn LED theo kịch bản bạn đã lập trình.";
            } else {
                document.getElementById('test-luna-speech-text').innerText = "🤖 LUNA: Trời đã tối hẳn! Chưa thiết lập kịch bản bật đèn tự động nên phòng đang tối thui.";
            }
        }, 5000);
    },

    startDayTransition() {
        const containers = document.querySelectorAll('.inner-room-container');
        containers.forEach(container => {
            container.classList.remove('night-time');
            container.classList.add('transition-5s');
        });

        document.getElementById('test-luna-speech-text').innerText = "🤖 LUNA: Trời đang chuyển dần sang sáng...";

        setTimeout(() => {
            containers.forEach(container => {
                container.classList.remove('transition-5s');
            });
        }, 5000);
    },

    initDragAndDrop() {
        const trashItems = document.querySelectorAll('.trash-item');
        const dropZone = document.getElementById('test-room-viewport-container');

        trashItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.getAttribute('data-type'));
                e.dataTransfer.effectAllowed = 'copy';
                SoundManager.playBeep(500, 0.05);
            });
        });

        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('text/plain');
                if (!type) return;

                this.dropTrashInRoom(type);
            });
        }
    },

    dropTrashInRoom(type) {
        // Tọa độ ngẫu nhiên gần trung tâm của sàn (viewBox 1000 x 450)
        // Khu vực sàn phòng khách: x từ 400 đến 700, y từ 365 đến 415
        const x = Math.floor(Math.random() * 300) + 400;
        const y = Math.floor(Math.random() * 50) + 365;
        const id = 'trash_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

        const trashItem = { id, type, x, y };
        GameData.trashInRoom.push(trashItem);

        // Hiển thị rác vào SVG
        this.renderTrashInSVG(trashItem);

        SoundManager.playBeep(400, 0.1, 'triangle');

        // Tự động kiểm tra bật robot hút bụi khi phát hiện nhà dơ
        const vacuumRule = GameData.connections.find(r => r.device === 'vacuum' && r.command === 'Nhà dơ quá' && r.actionKey === 'vacuum_on');
        
        if (vacuumRule && !GameData.deviceStates.vacuum) {
            this.executeRule(vacuumRule);
            document.getElementById('test-luna-speech-text').innerText = `🤖 LUNA: Phát hiện bạn vừa thả ${this.getTrashName(type)} (Nhà dơ quá)! Tôi tự động kích hoạt robot hút bụi.`;
        } else {
            document.getElementById('test-luna-speech-text').innerText = `🤖 LUNA: Đã thả ${this.getTrashName(type)} vào phòng!`;
        }

        // Bắt đầu dọn dẹp nếu robot đang chạy
        if (GameData.deviceStates.vacuum) {
            this.runVacuumCleaning();
        }
    },

    getTrashEmoji(type) {
        switch (type) {
            case 'tissue': return '🧻';
            case 'plastic_bag': return '🛍️';
            case 'plastic_cup': return '🥤';
            case 'plastic_bottle': return '🧴';
            default: return '🗑️';
        }
    },

    getTrashName(type) {
        switch (type) {
            case 'tissue': return 'giấy ăn';
            case 'plastic_bag': return 'bọc nilon';
            case 'plastic_cup': return 'ly nhựa';
            case 'plastic_bottle': return 'chai nhựa';
            default: return 'rác';
        }
    },

    renderTrashInSVG(trashItem) {
        const trashLayer = document.getElementById('trash-layer');
        if (!trashLayer) return;

        const emoji = this.getTrashEmoji(trashItem.type);
        const name = this.getTrashName(trashItem.type);

        const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textNode.setAttribute('id', trashItem.id);
        textNode.setAttribute('x', trashItem.x);
        textNode.setAttribute('y', trashItem.y);
        textNode.setAttribute('font-size', '26');
        textNode.setAttribute('text-anchor', 'middle');
        textNode.setAttribute('dominant-baseline', 'central');
        textNode.setAttribute('class', 'trash-item-in-room');
        textNode.style.cssText = "cursor: pointer; user-select: none; transition: transform 0.4s ease, opacity 0.4s ease;";
        textNode.textContent = emoji;

        // Tooltip hiển thị tên rác khi hover
        textNode.addEventListener('mouseenter', () => {
            const tooltip = document.getElementById('test-device-tooltip');
            if (tooltip) {
                tooltip.innerText = `Rác: ${name}`;
                tooltip.classList.add('show');
                
                const rect = textNode.getBoundingClientRect();
                const container = document.getElementById('test-room-viewport-container').getBoundingClientRect();
                tooltip.style.top = `${rect.top - container.top - 20}px`;
                tooltip.style.left = `${rect.left - container.left + rect.width / 2}px`;
            }
        });

        textNode.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('test-device-tooltip');
            if (tooltip) tooltip.classList.remove('show');
        });

        trashLayer.appendChild(textNode);
    },

    runVacuumCleaning() {
        if (this.isVacuumCleaning) return;
        if (!GameData.deviceStates.vacuum) return;

        if (this.vacuumReturnTimer) {
            clearTimeout(this.vacuumReturnTimer);
            this.vacuumReturnTimer = null;
        }

        if (GameData.trashInRoom.length === 0) {
            return;
        }

        this.isVacuumCleaning = true;

        // Tìm mẫu rác gần nhất với robot hiện tại
        let nearestTrash = null;
        let minDist = Infinity;

        GameData.trashInRoom.forEach(trash => {
            const dist = Math.hypot(trash.x - GameData.vacuumPos.x, trash.y - GameData.vacuumPos.y);
            if (dist < minDist) {
                minDist = dist;
                nearestTrash = trash;
            }
        });

        if (!nearestTrash) {
            this.isVacuumCleaning = false;
            return;
        }

        // Thêm class báo hiệu robot đang tự động điều khiển di chuyển
        const roomSvgs = document.querySelectorAll('.inner-room-svg');
        roomSvgs.forEach(svg => svg.classList.add('vacuum-cleaning-active'));

        const targetX = nearestTrash.x;
        const targetY = nearestTrash.y;

        const vacuumEl = document.getElementById('device-vacuum');
        if (vacuumEl) {
            const dx = targetX - 200;
            const dy = targetY - 385;
            vacuumEl.style.transform = `translate(${dx}px, ${dy}px)`;
        }

        GameData.vacuumPos = { x: targetX, y: targetY };

        // Thời gian di chuyển là 1.2s tương thích với CSS transition
        setTimeout(() => {
            const index = GameData.trashInRoom.findIndex(t => t.id === nearestTrash.id);
            if (index !== -1) {
                const trashObj = GameData.trashInRoom[index];
                GameData.trashInRoom.splice(index, 1);

                // Chạy hiệu ứng bay vào thùng rác hoặc thu nhỏ
                const trashEl = document.getElementById(trashObj.id);
                if (trashEl) {
                    trashEl.style.transform = 'scale(0)';
                    trashEl.style.opacity = '0';
                    setTimeout(() => {
                        trashEl.remove();
                    }, 400);
                }

                SoundManager.playBeep(800, 0.15, 'sine');
                document.getElementById('test-luna-speech-text').innerText = `🤖 LUNA: Đã dọn sạch ${this.getTrashName(trashObj.type)} thành công!`;
            }

            this.isVacuumCleaning = false;

            // Tiếp tục dọn rác tiếp theo nếu còn
            if (GameData.trashInRoom.length > 0) {
                this.runVacuumCleaning();
            } else {
                // Sạch rác: hẹn giờ 5 giây tự quay về dock sạc và tắt
                this.startVacuumReturnCountdown();
            }
        }, 1200);
    },

    startVacuumReturnCountdown() {
        if (this.vacuumReturnTimer) clearTimeout(this.vacuumReturnTimer);

        this.vacuumReturnTimer = setTimeout(() => {
            const vacuumEl = document.getElementById('device-vacuum');
            if (vacuumEl) {
                vacuumEl.style.transform = 'translate(0px, 0px)';
            }
            GameData.vacuumPos = { x: 200, y: 385 };

            this.toggleDevice('vacuum', false);

            const roomSvgs = document.querySelectorAll('.inner-room-svg');
            roomSvgs.forEach(svg => svg.classList.remove('vacuum-cleaning-active'));

            document.getElementById('test-luna-speech-text').innerText = "🤖 LUNA: Sàn nhà sạch sẽ! Robot tự động quay về trạm sạc và tắt nguồn.";
        }, 5000);
    },

    resetWholeGame() {
        // Tắt bộ đếm sáng tối
        if (this.timeCycleInterval) {
            clearInterval(this.timeCycleInterval);
            this.timeCycleInterval = null;
        }

        if (this.vacuumReturnTimer) {
            clearTimeout(this.vacuumReturnTimer);
            this.vacuumReturnTimer = null;
        }

        SoundManager.playChime();
        GameData.connections = [];
        GameData.trashInRoom = [];

        const trashLayer = document.getElementById('trash-layer');
        if (trashLayer) trashLayer.innerHTML = '';

        for (let dev in GameData.deviceStates) {
            this.toggleDevice(dev, false);
        }

        const containers = document.querySelectorAll('.inner-room-container');
        containers.forEach(container => {
            container.classList.remove('night-time', 'transition-5s');
        });

        const roomSvgs = document.querySelectorAll('.inner-room-svg');
        roomSvgs.forEach(svg => {
            svg.classList.remove('vacuum-cleaning-active');
            const vacuumEl = svg.querySelector('#device-vacuum');
            if (vacuumEl) {
                vacuumEl.style.transform = 'translate(0px, 0px)';
            }
        });
        GameData.vacuumPos = { x: 200, y: 385 };
        this.isVacuumCleaning = false;

        GameData.timeCycle = 'day';
        GameData.currentTemp = 28;
        this.updateTimeCycleUI();

        this.resetSelection();
        this.renderRulesEditor();
        this.migrateRoomSVG('inner-room-container-program');
        this.showScreen('intro');
    }
};
