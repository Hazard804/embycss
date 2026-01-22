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
        this.init();
    }

    init() {
        console.log('[倍速记忆] 初始化');
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
            if (!savedSpeed || savedSpeed === 1) return;
            
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
                    
                    // 保护期：防止被重置为 1x
                    let count = 0;
                    const protect = setInterval(() => {
                        document.querySelectorAll('video').forEach(video => {
                            if (video.playbackRate === 1) {
                                video.playbackRate = savedSpeed;
                                console.log(`[倍速记忆] 防止重置为 1x`);
                            }
                        });
                        if (++count >= 10) clearInterval(protect);
                    }, 500);
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
                    const isPlaying = !video.paused || video.currentTime > 0;
                    
                    if (isPlaying && speed !== 1 && !this.isRestoring) {
                        this.saveSpeed(speed);
                        console.log(`[倍速记忆] 保存倍速: ${speed}x`);
                    }
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
