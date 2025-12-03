// Emby自定义JavaScript - 设置默认音量为0
(function() {
    'use strict';

    console.log('[Emby音量控制] 脚本已加载');
    
    // 用于跟踪用户是否手动调整过音量
    const userAdjustedVolumes = new WeakMap();

    // 方法1: 监听DOM变化，捕获video元素
    const observer = new MutationObserver(function(mutations) {
        const videos = document.querySelectorAll('video');
        videos.forEach(function(video) {
            // 排除预告片的video元素（悬停预告片和原剧照预告片容器）
            if (video.closest('.jv-card-overlay') || 
                video.closest('#jv-similar-container') || 
                video.closest('#jv-image-container') ||
                video.closest('#jv-video-player')) {
                return; // 跳过所有预告片video
            }
            if (!video.dataset.volumeSet) {
                video.volume = 0;
                video.dataset.volumeSet = 'true';
                console.log('[Emby音量控制] 已将video音量设置为0');
                
                // 监听用户音量调整
                video.addEventListener('volumechange', function() {
                    if (this.volume > 0 || this.muted === false) {
                        userAdjustedVolumes.set(this, true);
                        console.log('[Emby音量控制] 用户已手动调整音量，停止自动设置');
                    }
                });
            }
        });
    });

    // 开始观察
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 方法2: 重写HTMLMediaElement的play方法
    if (window.HTMLMediaElement && !window.HTMLMediaElement.prototype._playOverridden) {
        const originalPlay = window.HTMLMediaElement.prototype.play;
        window.HTMLMediaElement.prototype.play = function() {
            // 排除所有预告片的video元素（悬停预告片和原剧照预告片容器）
            if (!this.closest('.jv-card-overlay') && 
                !this.closest('#jv-similar-container') && 
                !this.closest('#jv-image-container') &&
                !this.closest('#jv-video-player')) {
                this.volume = 0;
                console.log('[Emby音量控制] 播放时设置音量为0');
            }
            return originalPlay.apply(this, arguments);
        };
        window.HTMLMediaElement.prototype._playOverridden = true;
    }

    // 方法3: 定期检查（备用方案）- 只对未被用户调整过的video生效
    setInterval(function() {
        const videos = document.querySelectorAll('video');
        videos.forEach(function(video) {
            // 排除所有预告片的video元素（悬停预告片和原剧照预告片容器）
            if (video.closest('.jv-card-overlay') || 
                video.closest('#jv-similar-container') || 
                video.closest('#jv-image-container') ||
                video.closest('#jv-video-player')) {
                return; // 跳过所有预告片video
            }
            // 如果用户手动调整过音量，不再自动设置
            if (userAdjustedVolumes.has(video)) {
                return;
            }
            if (video.volume > 0) {
                video.volume = 0;
            }
        });
    }, 1000);

    // 方法4: 监听页面加载完成后立即设置
    function setVolumeOnLoad() {
        const videos = document.querySelectorAll('video');
        if (videos.length > 0) {
            videos.forEach(function(video) {
                // 排除所有预告片的video元素（悬停预告片和原剧照预告片容器）
                if (video.closest('.jv-card-overlay') || 
                    video.closest('#jv-similar-container') || 
                    video.closest('#jv-image-container') ||
                    video.closest('#jv-video-player')) {
                    return; // 跳过所有预告片video
                }
                video.volume = 0;
                
                // 监听用户音量调整
                video.addEventListener('volumechange', function() {
                    if (this.volume > 0 || this.muted === false) {
                        userAdjustedVolumes.set(this, true);
                        console.log('[Emby音量控制] 用户已手动调整音量，停止自动设置');
                    }
                });
                
                video.addEventListener('play', function() {
                    if (!this.closest('.jv-card-overlay') && 
                        !this.closest('#jv-similar-container') && 
                        !this.closest('#jv-image-container') &&
                        !this.closest('#jv-video-player') &&
                        !userAdjustedVolumes.has(this)) {
                        this.volume = 0;
                    }
                });
                video.addEventListener('loadedmetadata', function() {
                    if (!this.closest('.jv-card-overlay') && 
                        !this.closest('#jv-similar-container') && 
                        !this.closest('#jv-image-container') &&
                        !this.closest('#jv-video-player') &&
                        !userAdjustedVolumes.has(this)) {
                        this.volume = 0;
                    }
                });
            });
            console.log('[Emby音量控制] 已处理 ' + videos.length + ' 个video元素');
        }
    }

    // 页面加载时执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setVolumeOnLoad);
    } else {
        setVolumeOnLoad();
    }

    // 额外监听：Emby路由变化
    setTimeout(setVolumeOnLoad, 1000);
    setTimeout(setVolumeOnLoad, 3000);

})();