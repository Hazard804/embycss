/**
 * Emby 播放倍速记忆功能
 * 自动保存和恢复播放器倍速设置，支持浏览器刷新和重启
 * 兼容 Web 端和 Emby Theater 客户端
 */

(function(window) {
    'use strict';
    
    // 检测运行环境
    const isTheater = !!(window.require && window.process && window.process.versions && window.process.versions.electron);
    console.log(`[倍速记忆] 运行环境: ${isTheater ? 'Emby Theater (Electron)' : 'Web 浏览器'}`);

class RememberPlaybackSpeed {
    constructor() {
        this.STORAGE_KEY = 'emby_playback_speed';
        this.isRestoring = false;
        this.isTheater = isTheater;
        this.normalSpeedDecisionTimer = null;
        this.init();
    }

    init() {
        console.log('[倍速记忆] 初始化');
        this.bindSpeedControlMonitor();
        this.waitForPlayer();
    }

    // 等待并监控视频播放器
    waitForPlayer() {
        const checkInterval = setInterval(() => {
            const videos = document.querySelectorAll('video');
            if (videos.length > 0) {
                console.log(`[倍速记忆] 检测到 ${videos.length} 个视频元素`);
                clearInterval(checkInterval);
                this.setupMonitor();
            }
        }, 500);
    }

    // 设置监控和恢复
    setupMonitor() {
        const restoreSpeed = () => {
            if (this.isRestoring) return;
            
            const savedSpeed = this.getSavedSpeed();
            if (!this.isValidSpeed(savedSpeed)) return;
            
            this.isRestoring = true;
            console.log(`[倍速记忆] 恢复倍速: ${savedSpeed}x`);
            
            // 应用倍速到所有视频元素
            const applySpeed = () => {
                const videos = document.querySelectorAll('video');
                let success = true;
                
                videos.forEach(video => {
                    video.playbackRate = savedSpeed;
                    if (Math.abs(video.playbackRate - savedSpeed) > 0.01) {
                        success = false;
                    }
                });
                
                if (success) {
                    console.log(`[倍速记忆] ✓ 恢复成功: ${savedSpeed}x`);
                    this.isRestoring = false;
                } else {
                    setTimeout(applySpeed, 300);
                }
            };
            
            applySpeed();
        };

        // 监控所有视频元素
        const monitor = () => {
            const videos = document.querySelectorAll('video');
            
            videos.forEach((video, index) => {
                if (video.dataset.speedMonitored) return;
                video.dataset.speedMonitored = 'true';
                
                // 监听倍速变化（保存用户修改）
                video.addEventListener('ratechange', () => {
                    const speed = video.playbackRate;
                    
                    if (!this.isValidSpeed(speed) || this.isRestoring) return;

                    const savedSpeed = this.getSavedSpeed();
                    if (
                        this.isNormalSpeed(speed) &&
                        this.isValidSpeed(savedSpeed) &&
                        !this.isNormalSpeed(savedSpeed)
                    ) {
                        this.handleNormalSpeedChange(video, restoreSpeed);
                        return;
                    }

                    this.cancelNormalSpeedDecision();
                    this.saveSpeed(speed);
                    console.log(`[倍速记忆] 保存倍速: ${speed}x`);
                });

                // 关键时机恢复倍速
                ['loadedmetadata', 'canplay', 'play'].forEach(event => {
                    video.addEventListener(event, () => {
                        console.log(`[倍速记忆] ${event} 事件 - 恢复倍速`);
                        restoreSpeed();
                    });
                });
            });
            
            // 视频元素被移除时重新等待
            if (videos.length === 0) {
                clearInterval(monitorInterval);
                this.waitForPlayer();
            }
        };

        // 初始恢复
        restoreSpeed();
        
        // 定时检查（前 5 秒）
        let count = 0;
        const initCheck = setInterval(() => {
            restoreSpeed();
            if (++count >= 5) clearInterval(initCheck);
        }, 1000);

        // 持续监控
        const monitorInterval = setInterval(monitor, 300);
        monitor();
        
        console.log('[倍速记忆] 监控已启动');
    }

    bindSpeedControlMonitor() {
        document.addEventListener('click', event => {
            const selectedSpeed = this.parseSpeedFromEvent(event);
            if (this.isValidSpeed(selectedSpeed)) {
                this.cancelNormalSpeedDecision();
                this.saveSpeed(selectedSpeed);
                console.log(`[倍速记忆] 检测到倍速菜单选择: ${selectedSpeed}x`);
            }
        }, true);
    }

    handleNormalSpeedChange(video, restoreSpeed) {
        this.cancelNormalSpeedDecision();

        this.normalSpeedDecisionTimer = setTimeout(() => {
            this.normalSpeedDecisionTimer = null;

            const savedSpeed = this.getSavedSpeed();
            if (!this.isValidSpeed(savedSpeed) || this.isNormalSpeed(savedSpeed)) return;
            if (!this.isNormalSpeed(video.playbackRate)) return;

            console.log(`[倍速记忆] 检测到播放器自动重置为 1x，恢复 ${savedSpeed}x`);
            restoreSpeed();
        }, 400);
    }

    cancelNormalSpeedDecision() {
        if (this.normalSpeedDecisionTimer) {
            clearTimeout(this.normalSpeedDecisionTimer);
            this.normalSpeedDecisionTimer = null;
        }
    }

    parseSpeedFromEvent(event) {
        const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];

        for (const element of path) {
            if (!element || element === document || element === window) continue;

            const candidates = [
                element.getAttribute && element.getAttribute('aria-label'),
                element.getAttribute && element.getAttribute('title'),
                element.getAttribute && element.getAttribute('data-value'),
                element.getAttribute && element.getAttribute('value'),
                element.textContent
            ];

            for (const candidate of candidates) {
                const speed = this.parseSpeedLabel(candidate);
                if (this.isValidSpeed(speed)) return speed;
            }
        }

        return null;
    }

    parseSpeedLabel(text) {
        if (!text) return null;

        const label = text.trim().replace(/\s+/g, ' ');
        if (!label || label.length > 24) return null;

        if (/^(normal|default|标准|正常|原速)$/i.test(label)) return 1;

        const match = label.match(/^(\d+(?:\.\d+)?)\s*(?:x|倍)$/i) ||
            label.match(/^x\s*(\d+(?:\.\d+)?)$/i);

        if (!match) return null;

        const speed = parseFloat(match[1]);
        return speed > 0 && speed <= 16 ? speed : null;
    }

    // localStorage 操作
    saveSpeed(speed) {
        if (this.isTheater) {
            // Electron 环境使用 localStorage
            localStorage.setItem(this.STORAGE_KEY, speed.toString());
        } else {
            // Web 环境
            localStorage.setItem(this.STORAGE_KEY, speed.toString());
        }
    }

    getSavedSpeed() {
        const speed = localStorage.getItem(this.STORAGE_KEY);
        return speed ? parseFloat(speed) : null;
    }

    isValidSpeed(speed) {
        return Number.isFinite(speed) && speed > 0;
    }

    isNormalSpeed(speed) {
        return Math.abs(speed - 1) < 0.01;
    }
}

// 页面加载后自动启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.rememberPlaybackSpeedInstance = new RememberPlaybackSpeed();
    });
} else {
    window.rememberPlaybackSpeedInstance = new RememberPlaybackSpeed();
}

// 导出到 window（便于调试）
window.RememberPlaybackSpeed = RememberPlaybackSpeed;

})(window);
