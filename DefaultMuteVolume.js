(function() {
    'use strict';

    const STORAGE_KEY = 'emby_session_volume';
    console.log('[Emby音量控制] 脚本已加载');

    // 获取存储的音量，新标签页默认为 0
    const getSavedVolume = () => {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        return saved !== null ? parseFloat(saved) : 0;
    };

    // 应用音量
    const applyVolume = (video) => {
        if (video.dataset.applying === 'true' || 
            video.closest('.jv-card-overlay') || 
            video.closest('#jv-similar-container') || 
            video.closest('#jv-image-container') ||
            video.closest('#jv-video-player')) return;

        const targetVolume = getSavedVolume();
        
        // 只有在差距明显时才调整
        if (Math.abs(video.volume - targetVolume) > 0.05) {
            video.dataset.applying = 'true';
            video.volume = targetVolume;
            video.muted = (targetVolume === 0);
            console.log(`[Emby音量控制] 初始化/切换视频，应用会话音量: ${targetVolume}`);
            
            // 延迟释放锁，防止 Emby 的初始化事件触发 volumechange 导致覆盖
            setTimeout(() => { delete video.dataset.applying; }, 500);
        }

        // 绑定监听
        if (!video.dataset.volumeListener) {
            video.addEventListener('volumechange', function() {
                // 如果是在执行 applyVolume 期间，或者音量变为 0（除非是主动关静音），不保存
                if (this.dataset.applying === 'true') return;

                // 记录用户手动调整的值
                sessionStorage.setItem(STORAGE_KEY, this.volume);
                console.log(`[Emby音量控制] 用户手动调整，已记录: ${this.volume}`);
            });
            video.dataset.volumeListener = 'true';
        }
    };

    // 使用 MutationObserver 捕获新产生的 video 标签
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                const videos = document.querySelectorAll('video');
                videos.forEach(v => {
                    // 给 Emby 一点时间加载 metadata
                    setTimeout(() => applyVolume(v), 300);
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 针对播放开始时的强制覆盖
    document.addEventListener('play', (e) => {
        if (e.target.tagName === 'VIDEO') {
            applyVolume(e.target);
        }
    }, true);

    // 针对 Emby 视图切换
    window.addEventListener('viewshow', () => {
        setTimeout(() => {
            const videos = document.querySelectorAll('video');
            videos.forEach(applyVolume);
        }, 500);
    });

})();