class ExtraFanart {
	static start() {
		this.startImageIndex = parseInt(localStorage.getItem('extraFanartStartIndex')) || 2;
		this.endImageIndex = 0;
		this.currentZoomedImageIndex = -1;
		this.itemId = null;
		this.imageMap = new Map();
		this.imageTagMap = new Map();
		this.trailerUrl = null;
		this.itemDetails = null;
		this.isLoading = false;
		this.trailerPreloaded = false;

		this.imageContainer = this.createImageContainer();
		this.zoomedMask = this.createZoomedMask();
		this.videoPlayer = this.createVideoPlayer();

		this.zoomedImage = this.zoomedMask.querySelector('#jv-zoom-img');
		this.zoomedImageWrapper = this.zoomedMask.querySelector('#jv-zoom-img-wrapper');
		this.zoomedImageDescription = this.zoomedMask.querySelector('#jv-zoom-img-desc');
		this.leftButton = this.zoomedMask.querySelector('.jv-left-btn');
		this.rightButton = this.zoomedMask.querySelector('.jv-right-btn');

		this.injectStyles();
		this.init();
	}

	static getCurrentItemId() {
		return location.hash.match(/id\=(\w+)/)?.[1] ?? null;
	}

	static getBackgroundImageSrc(index) {
		const currentItemId = this.getCurrentItemId();
		if (!currentItemId) return null;
		
		const tag = this.imageTagMap.get(index);
		
		if (typeof ApiClient !== 'undefined' && tag) {
			// 使用 ApiClient 方法并带 tag 参数（适用于 Windows 客户端）
			return ApiClient.getImageUrl(currentItemId, {
				type: 'Backdrop',
				index: index,
				maxWidth: 1280,
				tag: tag
			});
		} else {
			// 降级方案：手动拼接 URL（适用于网页版）
			return `${location.origin}/Items/${currentItemId}/Images/Backdrop/${index}?maxWidth=1280`;
		}
	}

	static createImageContainer() {
		const container = document.createElement('div');
		container.id = 'jv-image-container';
		container.innerHTML = `
			<div class="jv-section-header">
				<h2 class="jv-section-title">
					<svg class="jv-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
						<line x1="7" y1="2" x2="7" y2="22"></line>
						<line x1="17" y1="2" x2="17" y2="22"></line>
						<line x1="2" y1="12" x2="22" y2="12"></line>
						<line x1="2" y1="7" x2="7" y2="7"></line>
						<line x1="2" y1="17" x2="7" y2="17"></line>
						<line x1="17" y1="17" x2="22" y2="17"></line>
						<line x1="17" y1="7" x2="22" y2="7"></line>
					</svg>
					剧照
				</h2>
				<span class="jv-image-count"></span>
			</div>
			<div class="jv-images-grid"></div>
		`;
		return container;
	}

	static createZoomedMask() {
		const mask = document.createElement('div');
		mask.id = 'jv-zoom-mask';
		mask.innerHTML = `
			<button class="jv-zoom-btn jv-left-btn"></button>
			<div id="jv-zoom-img-wrapper">
				<img id="jv-zoom-img" />
				<div id="jv-zoom-img-desc"></div>
			</div>
			<button class="jv-zoom-btn jv-right-btn"></button>
		`;
		return mask;
	}

	static createVideoPlayer() {
		const player = document.createElement('div');
		player.id = 'jv-video-player';
		player.innerHTML = `
			<div class="jv-video-content">
				<button class="jv-video-close">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
				<div id="jv-video-container">
					<video id="jv-video" controls autoplay muted>
						<source src="" type="video/mp4">
						您的浏览器不支持视频播放
					</video>
					<iframe id="jv-video-iframe" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>
				</div>
			</div>
		`;
		return player;
	}
	
	static convertYouTubeUrl(url) {
		if (!url) return null;
		
		// 匹配各种 YouTube URL 格式
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
			/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
		];
		
		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match && match[1]) {
				return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1`;
			}
		}
		
		return null;
	}
	
	static isYouTubeUrl(url) {
		return url && (url.includes('youtube.com') || url.includes('youtu.be'));
	}

	static calculateFitSize(naturalWidth, naturalHeight) {
		// 获取可用空间，留出边距
		const maxWidth = this.zoomedMask.clientWidth * 0.9;
		const maxHeight = this.zoomedMask.clientHeight * 0.9;
		
		// 计算缩放比例，允许放大和缩小以适应窗口
		const widthRatio = maxWidth / naturalWidth;
		const heightRatio = maxHeight / naturalHeight;
		const scale = Math.min(widthRatio, heightRatio); // 选择较小的缩放比例以保持宽高比
		
		return {
			width: naturalWidth * scale,
			height: naturalHeight * scale
		};
	}

	static setRectOfElement(element, rect) {
		['width', 'height', 'left', 'top'].forEach(key => {
			element.style[key] = `${rect[key]}px`;
		});
	}

	static setDescription() {
		this.zoomedImageDescription.innerHTML = `${this.currentZoomedImageIndex - this.startImageIndex + 1} of ${this.endImageIndex - this.startImageIndex + 1}`;
	}

	static async awaitTransitionEnd(element) {
		return new Promise(resolve => {
			element.addEventListener('transitionend', resolve, { once: true });
		});
	}

	static async changeImageIndex(index) {
		const imageSrc = this.getBackgroundImageSrc(index);
		if (!imageSrc) return;
		const imageElement = this.imageMap.get(index);
		if (!imageElement) return;
		
		// 淡出当前图片
		this.zoomedImage.style.opacity = '0';
		await new Promise(resolve => setTimeout(resolve, 200));
		
		// 预加载新图片
		const newImage = new Image();
		await new Promise((resolve, reject) => {
			newImage.onload = resolve;
			newImage.onerror = reject;
			newImage.src = imageSrc;
		});
		
		// 更新尺寸和位置，自适应窗口大小
		const fitSize = this.calculateFitSize(newImage.naturalWidth, newImage.naturalHeight);
		this.setRectOfElement(this.zoomedImageWrapper, {
			left: (this.zoomedMask.clientWidth - fitSize.width) / 2,
			top: (this.zoomedMask.clientHeight - fitSize.height) / 2,
			width: fitSize.width,
			height: fitSize.height
		});
		
		// 更换图片源
		this.zoomedImage.src = imageSrc;
		this.setDescription();
		
		// 淡入新图片
		await new Promise(resolve => setTimeout(resolve, 50));
		this.zoomedImage.style.opacity = '1';
	}

	static async showZoomedMask(index) {
		const imageSrc = this.getBackgroundImageSrc(index);
		if (!imageSrc) return;

		this.zoomedImageWrapper.classList.add('animate');
		this.zoomedImage.src = imageSrc;

		const imageElement = this.imageMap.get(index);
		if (!imageElement) return;
		const rect = imageElement.getBoundingClientRect();
		this.setRectOfElement(this.zoomedImageWrapper, rect);
		this.zoomedMask.style.display = 'flex';

		const action = () => {
			const fitSize = this.calculateFitSize(imageElement.naturalWidth, imageElement.naturalHeight);
			this.setRectOfElement(this.zoomedImageWrapper, {
				left: (this.zoomedMask.clientWidth - fitSize.width) / 2,
				top: (this.zoomedMask.clientHeight - fitSize.height) / 2,
				width: fitSize.width,
				height: fitSize.height
			});
		};

		if (document.startViewTransition) {
			const transition = document.startViewTransition(action);
			await transition.finished;
		} else {
			action();
			await this.awaitTransitionEnd(this.zoomedImageWrapper);
		}

		this.setDescription();
		this.zoomedImageWrapper.classList.remove('animate');
	}

	static async hideZoomedMask() {
		this.zoomedImageDescription.innerHTML = '';
		this.zoomedImageWrapper.classList.add('animate');
		const action = () => {
			const imageElement = this.imageMap.get(this.currentZoomedImageIndex);
			if (!imageElement) return;
			const rect = imageElement.getBoundingClientRect();
			this.setRectOfElement(this.zoomedImageWrapper, rect);
		};
		if (document.startViewTransition) {
			const transition = document.startViewTransition(action);
			await transition.finished;
		} else {
			action();
			await this.awaitTransitionEnd(this.zoomedImageWrapper);
		}

		this.zoomedMask.style.display = 'none';
		this.currentZoomedImageIndex = -1;
		this.zoomedImageWrapper.classList.remove('animate');
	}

	static createImageElement(index) {
		const imageSrc = this.getBackgroundImageSrc(index);
		const imageElement = document.createElement('img');
		imageElement.src = imageSrc;
		imageElement.className = 'jv-image';
		imageElement.onclick = () => {
			this.currentZoomedImageIndex = index;
			this.showZoomedMask(index);
		};
		return imageElement;
	}

	static createTrailerElement() {
		const wrapper = document.createElement('div');
		wrapper.className = 'jv-trailer-wrapper';
		
		// 预告片缩略图使用索引0的背景图
		const tag = this.imageTagMap.get(0);
		const imageSrc = tag ? this.getBackgroundImageSrc(0) : '';
		wrapper.innerHTML = `
			<img src="${imageSrc || ''}" class="jv-image jv-trailer-thumb" />
			<div class="jv-play-icon">
				<svg viewBox="0 0 24 24" fill="white">
					<circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.6)" stroke="white" stroke-width="2"/>
					<polygon points="10,8 16,12 10,16" fill="white"/>
				</svg>
			</div>
			<div class="jv-trailer-badge">预告片</div>
		`;
		
		wrapper.onclick = () => {
			this.playTrailer();
		};
		
		return wrapper;
	}

	static async appendImagesToContainer(imageCount) {
		const imageFragment = document.createDocumentFragment();
		
		// 如果有预告片，先添加预告片
		if (this.trailerUrl) {
			const trailerElement = this.createTrailerElement();
			imageFragment.appendChild(trailerElement);
		}
		
		for (let index = this.startImageIndex; index <= imageCount; index++) {
			const imageElement = this.createImageElement(index);
			imageFragment.appendChild(imageElement);
			this.imageMap.set(index, imageElement);
		}
		const gridContainer = this.imageContainer.querySelector('.jv-images-grid');
		if (gridContainer) {
			gridContainer.appendChild(imageFragment);
		}
		
		// 更新图片数量显示
		const countElement = this.imageContainer.querySelector('.jv-image-count');
		if (countElement) {
			const totalImages = imageCount - this.startImageIndex + 1;
			const totalText = this.trailerUrl ? `预告片 + ${totalImages} 张` : `共 ${totalImages} 张`;
			countElement.textContent = totalText;
		}
	}

	static showContainer(imageCount) {
		// 如果既没有剧照也没有预告片，不显示容器
		if (imageCount < this.startImageIndex && !this.trailerUrl) {
			return;
		}
		
		// 先尝试找演职人员区域作为锚点
		const anchorSelectors = [
			'#itemDetailPage:not(.hide) #castCollapsible',
			'.itemView:not(.hide) .peopleSection'
		];
		
		let anchorElement = null;
		for (const selector of anchorSelectors) {
			anchorElement = document.querySelector(selector);
			if (anchorElement) {
				break;
			}
		}
		
		if (!anchorElement) {
			return;
		}
		
		// 检查容器是否已经在DOM中
		if (!document.body.contains(this.imageContainer)) {
			// 直接插入到锚点元素之后（与原始脚本一致）
			anchorElement.insertAdjacentElement('afterend', this.imageContainer);
		} else {
			// 如果容器已存在但位置错误（offsetWidth为0），重新插入
			if (this.imageContainer.offsetWidth === 0) {
				anchorElement.insertAdjacentElement('afterend', this.imageContainer);
			}
		}
		
		this.imageContainer.style.display = 'block';
	}

	static isDetailsPage() {
		return location.hash.includes('/details?id=') || location.hash.includes('/item?id=');
	}

	static async getItemDetails(itemId) {
		if (typeof ApiClient !== 'undefined') {
			try {
				const userId = ApiClient.getCurrentUserId();
				return await ApiClient.getItem(userId, itemId);
			} catch (error) {
				console.warn('获取媒体详情失败:', error);
			}
		}
		return null;
	}

	static async getTrailerUrl(itemId) {
		const details = await this.getItemDetails(itemId);
		if (details && details.RemoteTrailers && details.RemoteTrailers.length > 0) {
			return details.RemoteTrailers[0].Url;
		}
		return null;
	}

	static async getEndImageIndex() {
		if (typeof ApiClient !== 'undefined') {
			try {
				const response = await ApiClient.getItem(ApiClient.getCurrentUserId(), this.getCurrentItemId());
				if (response.BackdropImageTags && response.BackdropImageTags.length > 0) {
					// 存储每张图片的tag
					response.BackdropImageTags.forEach((tag, index) => {
						this.imageTagMap.set(index, tag);
					});
					return response.BackdropImageTags.length - 1;
				}
				return 0;
			} catch (error) {
				console.warn('获取图片数量失败，使用二分查找:', error);
			}
		}
		
		// 二分查找图片数量
		let left = this.startImageIndex;
		let right = this.startImageIndex + 20;
		let found = false;
		while (left <= right) {
			let mid = Math.floor((left + right) / 2);
			const newSrc = this.getBackgroundImageSrc(mid);
			try {
				const response = await fetch(newSrc, { method: 'HEAD' });
				if (!response.ok) throw new Error('Image not found.');
				found = true;
				left = mid + 1;
			} catch (error) {
				right = mid - 1;
			}
		}
		return found ? right : 0;
	}

	static async loadImages() {
		if (!this.isDetailsPage()) return;
		const currentItemId = this.getCurrentItemId();
		if (!currentItemId) return;
		
		// 防抖：如果正在加载中或者已经加载过这个项目，跳过
		if (this.isLoading || this.itemId === currentItemId) return;
		this.isLoading = true;
		
		try {
			// 先清空旧数据
			const gridContainer = this.imageContainer.querySelector('.jv-images-grid');
			if (gridContainer) {
				gridContainer.innerHTML = '';
			}
			this.imageMap.clear();
			this.imageTagMap.clear();
			
			// 获取图片数量和tag信息
			this.endImageIndex = await this.getEndImageIndex();
			// 获取预告片URL
			this.trailerUrl = await this.getTrailerUrl(currentItemId);
			this.itemId = currentItemId;
			
			// 获取到预告片后立即预加载
			if (this.trailerUrl) {
				this.trailerPreloaded = false;
				setTimeout(() => this.preloadTrailer(), 100);
			}
			await this.appendImagesToContainer(this.endImageIndex);
			this.showContainer(this.endImageIndex);
		} catch (error) {
			console.error('[ExtraFanart] 加载失败:', error);
		} finally {
			this.isLoading = false;
		}
	}

	static handleLeftButtonClick(e) {
		e.stopPropagation();
		if (this.currentZoomedImageIndex === -1) return;
		if (this.currentZoomedImageIndex > this.startImageIndex) {
			this.currentZoomedImageIndex--;
		} else {
			this.currentZoomedImageIndex = this.endImageIndex;
		}
		this.changeImageIndex(this.currentZoomedImageIndex);
	}

	static handleRightButtonClick(e) {
		e.stopPropagation();
		if (this.currentZoomedImageIndex === -1) return;
		if (this.currentZoomedImageIndex < this.endImageIndex) {
			this.currentZoomedImageIndex++;
		} else {
			this.currentZoomedImageIndex = this.startImageIndex;
		}
		this.changeImageIndex(this.currentZoomedImageIndex);
	}

	static handleKeydown(e) {
		if (this.currentZoomedImageIndex === -1) return;
		e.stopPropagation();
		if (e.key === 'ArrowLeft') {
			this.handleLeftButtonClick(e);
		} else if (e.key === 'ArrowRight') {
			this.handleRightButtonClick(e);
		} else if (e.key === 'Escape') {
			this.hideZoomedMask();
		}
	}

	static handleResize() {
		// 如果当前有放大的图片，重新调整其尺寸
		if (this.currentZoomedImageIndex === -1) return;
		
		const imageElement = this.imageMap.get(this.currentZoomedImageIndex);
		if (!imageElement) return;
		
		const fitSize = this.calculateFitSize(imageElement.naturalWidth, imageElement.naturalHeight);
		this.setRectOfElement(this.zoomedImageWrapper, {
			left: (this.zoomedMask.clientWidth - fitSize.width) / 2,
			top: (this.zoomedMask.clientHeight - fitSize.height) / 2,
			width: fitSize.width,
			height: fitSize.height
		});
	}

	static registerEventListeners() {
		// 监听页面显示事件
		document.addEventListener('viewshow', () => {
			if (!ExtraFanart.isLoading) {
				// 重置 itemId 允许重新加载
				ExtraFanart.itemId = null;
				setTimeout(() => ExtraFanart.loadImages(), 100);
				setTimeout(() => ExtraFanart.loadImages(), 400);
			}
		});
		
		// 监听 URL hash 变化
		window.addEventListener('hashchange', () => {
			if (!ExtraFanart.isLoading) {
				// 重置 itemId 允许重新加载
				ExtraFanart.itemId = null;
				setTimeout(() => ExtraFanart.loadImages(), 100);
			}
		});
		
		document.addEventListener('keydown', (e) => this.handleKeydown(e));
		window.addEventListener('resize', () => this.handleResize());
		this.leftButton.addEventListener('click', (e) => this.handleLeftButtonClick(e));
		this.rightButton.addEventListener('click', (e) => this.handleRightButtonClick(e));
		this.zoomedMask.addEventListener('click', () => this.hideZoomedMask());
		this.zoomedImageWrapper.addEventListener('click', (e) => this.handleRightButtonClick(e));
		this.zoomedMask.addEventListener('wheel', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (this.currentZoomedImageIndex === -1) return;
			if (e.deltaY > 0) {
				this.handleRightButtonClick(e);
			} else {
				this.handleLeftButtonClick(e);
			}
		});
	}

	static preloadTrailer() {
		if (!this.trailerUrl || this.trailerPreloaded) return;
		
		// YouTube 视频不需要预加载
		if (this.isYouTubeUrl(this.trailerUrl)) {
			this.trailerPreloaded = true;
			return;
		}
		
		const video = this.videoPlayer.querySelector('#jv-video source');
		const videoElement = this.videoPlayer.querySelector('#jv-video');
		video.src = this.trailerUrl;
		videoElement.muted = true;
		videoElement.preload = 'auto';
		videoElement.load();
		this.trailerPreloaded = true;
	}

	static async playTrailer() {
		if (!this.trailerUrl) return;
		
		const videoElement = this.videoPlayer.querySelector('#jv-video');
		const iframeElement = this.videoPlayer.querySelector('#jv-video-iframe');
		const videoContent = this.videoPlayer.querySelector('.jv-video-content');
		
		// 检查是否为 YouTube 链接
		const isYouTube = this.isYouTubeUrl(this.trailerUrl);
		
		if (isYouTube) {
			// 使用 iframe 播放 YouTube 视频
			const embedUrl = this.convertYouTubeUrl(this.trailerUrl);
			if (embedUrl) {
				videoElement.style.display = 'none';
				iframeElement.style.display = 'block';
				iframeElement.src = embedUrl;
			}
		} else {
			// 使用 video 标签播放普通视频
			videoElement.style.display = 'block';
			iframeElement.style.display = 'none';
			videoElement.muted = true;
			videoElement.play();
		}
		
		// 设置初始状态
		this.videoPlayer.style.display = 'flex';
		this.videoPlayer.style.opacity = '0';
		videoContent.style.transform = 'scale(0.9)';
		
		// 触发重排
		await new Promise(resolve => requestAnimationFrame(resolve));
		
		// 添加过渡类
		this.videoPlayer.classList.add('jv-video-opening');
		this.videoPlayer.style.opacity = '1';
		videoContent.style.transform = 'scale(1)';
		
		// 动画完成后移除过渡类
		setTimeout(() => {
			this.videoPlayer.classList.remove('jv-video-opening');
		}, 300);
	}

	static async closeVideoPlayer() {
		const videoElement = this.videoPlayer.querySelector('#jv-video');
		const iframeElement = this.videoPlayer.querySelector('#jv-video-iframe');
		const videoContent = this.videoPlayer.querySelector('.jv-video-content');
		
		// 添加关闭动画
		this.videoPlayer.classList.add('jv-video-closing');
		this.videoPlayer.style.opacity = '0';
		videoContent.style.transform = 'scale(0.9)';
		
		// 等待动画完成
		await new Promise(resolve => setTimeout(resolve, 250));
		
		// 停止播放并隐藏
		videoElement.pause();
		videoElement.currentTime = 0;
		iframeElement.src = '';
		
		this.videoPlayer.style.display = 'none';
		this.videoPlayer.classList.remove('jv-video-closing');
		
		// 重置状态
		videoContent.style.transform = 'scale(1)';
		videoElement.style.display = 'block';
		iframeElement.style.display = 'none';
	}

	static init() {
		document.body.appendChild(this.zoomedMask);
		document.body.appendChild(this.videoPlayer);
		this.registerEventListeners();
		
		// 视频播放器事件
		const closeBtn = this.videoPlayer.querySelector('.jv-video-close');
		closeBtn.addEventListener('click', () => this.closeVideoPlayer());
		this.videoPlayer.addEventListener('click', (e) => {
			if (e.target === this.videoPlayer) {
				this.closeVideoPlayer();
			}
		});
		
		// 多次重试加载，确保加载成功
		setTimeout(() => ExtraFanart.tryLoadImages(), 200);
		setTimeout(() => ExtraFanart.tryLoadImages(), 500);
		setTimeout(() => ExtraFanart.tryLoadImages(), 1000);
	}

	static tryLoadImages() {
		if (ExtraFanart.isDetailsPage() && ExtraFanart.getCurrentItemId()) {
			// 如果容器不存在或未显示，重置 itemId 并重新加载
			if (!ExtraFanart.imageContainer || ExtraFanart.imageContainer.style.display === 'none') {
				ExtraFanart.itemId = null;
				ExtraFanart.loadImages();
			}
		}
	}

	static injectStyles() {
		const css = `
			#jv-image-container {
				display: none;
				background: rgba(0, 0, 0, 0.3);
				backdrop-filter: blur(15px);
				box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
				padding: 24px;
				border-radius: 16px;
				margin: 30px auto;
				width: calc(100% - 230px);
				border: 1px solid rgba(255, 255, 255, 0.1);
			}

			.jv-section-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 20px;
				padding-bottom: 16px;
				border-bottom: 2px solid rgba(255, 255, 255, 0.1);
			}

			.jv-section-title {
				display: flex;
				align-items: center;
				gap: 12px;
				font-size: 24px;
				font-weight: 600;
				color: #ffffff;
				margin: 0;
				letter-spacing: 0.5px;
			}

			.jv-title-icon {
				width: 28px;
				height: 28px;
				color: #00a4dc;
				filter: drop-shadow(0 0 8px rgba(0, 164, 220, 0.3));
			}

			.jv-image-count {
				font-size: 14px;
				color: rgba(255, 255, 255, 0.6);
				background: rgba(255, 255, 255, 0.1);
				padding: 6px 14px;
				border-radius: 20px;
				font-weight: 500;
			}

			.jv-images-grid {
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
				gap: 16px;
				width: 100%;
			}

			.jv-image {
				width: 100%;
				height: 180px;
				object-fit: cover;
				cursor: zoom-in;
				user-select: none;
				border-radius: 12px;
				transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
				border: 2px solid transparent;
			}

			.jv-image:hover {
				transform: translateY(-4px) scale(1.02);
				box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
				border-color: rgba(0, 164, 220, 0.5);
			}

			.jv-trailer-wrapper {
				position: relative;
				width: 100%;
				height: 180px;
				cursor: pointer;
				border-radius: 12px;
				overflow: hidden;
			}

			.jv-trailer-wrapper:hover .jv-image {
				transform: scale(1.05);
			}

			.jv-trailer-wrapper:hover .jv-play-icon {
				transform: translate(-50%, -50%) scale(1.15);
			}

			.jv-play-icon {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				width: 60px;
				height: 60px;
				transition: transform 0.3s ease;
				filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
				z-index: 2;
			}

			.jv-trailer-badge {
				position: absolute;
				top: 12px;
				left: 12px;
				background: linear-gradient(135deg, #00a4dc 0%, #0077b6 100%);
				color: white;
				padding: 6px 12px;
				border-radius: 6px;
				font-size: 12px;
				font-weight: 600;
				z-index: 2;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
			}

			.jv-trailer-thumb {
				position: relative;
				z-index: 1;
			}

			#jv-video-player {
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: rgba(0, 0, 0, 0.95);
				display: none;
				justify-content: center;
				align-items: center;
				z-index: 1200;
				padding: 40px;
				opacity: 0;
			}

			#jv-video-player.jv-video-opening,
			#jv-video-player.jv-video-closing {
				transition: opacity 0.3s ease;
			}

			.jv-video-content {
				position: relative;
				width: 100%;
				max-width: 1200px;
				background: #000;
				border-radius: 12px;
				overflow: hidden;
				box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
				transform: scale(1);
			}

			.jv-video-opening .jv-video-content,
			.jv-video-closing .jv-video-content {
				transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
			}

			.jv-video-close {
				position: absolute;
				top: 16px;
				right: 16px;
				width: 40px;
				height: 40px;
				background: rgba(0, 0, 0, 0.7);
				border: none;
				border-radius: 50%;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				z-index: 10;
				transition: all 0.2s ease;
			}

			.jv-video-close:hover {
				background: rgba(255, 255, 255, 0.2);
				transform: scale(1.1);
			}

			.jv-video-close svg {
				width: 20px;
				height: 20px;
				color: white;
			}

			#jv-video {
				width: 100%;
				max-height: 80vh;
				display: block;
			}

			#jv-video-container {
				position: relative;
				width: 100%;
				padding-bottom: 56.25%; /* 16:9 宽高比 */
			}

			#jv-video,
			#jv-video-iframe {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
			}

			#jv-video-iframe {
				display: none;
			}

			#jv-zoom-mask {
				position: fixed;
				left: 0;
				right: 0;
				top: 0;
				bottom: 0;
				background: rgba(0, 0, 0, 0.85);
				display: none;
				justify-content: space-between;
				align-items: flex-start;
				padding: 20px;
				z-index: 1100;
				cursor: zoom-out;
			}

			#jv-zoom-img-wrapper {
				position: absolute;
				display: flex;
				flex-flow: column wrap;
				align-items: flex-end;
				user-select: none;
				cursor: pointer;
			}
			
			#jv-zoom-img-wrapper.animate {
				transition: left 0.4s ease, top 0.4s ease, width 0.4s ease;
			}

			#jv-zoom-img {
				width: 100%;
				border-radius: 8px;
				transition: opacity 0.3s ease;
			}

			#jv-zoom-img-desc {
				color: #cccccc;
				font-size: 14px;
				font-weight: 500;
				position: absolute;
				bottom: 0;
				right: 0;
				transform: translate(0, calc(100% + 8px));
				background: rgba(0, 0, 0, 0.6);
				padding: 4px 12px;
				border-radius: 4px;
			}

			.jv-zoom-btn {
				padding: 20px;
				cursor: pointer;
				background: rgba(255, 255, 255, 0.1);
				border: 0;
				outline: none;
				box-shadow: none;
				opacity: 0.7;
				display: flex;
				justify-content: center;
				align-items: center;
				margin-top: auto;
				margin-bottom: auto;
				border-radius: 8px;
				transition: all 0.2s ease;
			}

			.jv-zoom-btn:hover {
				opacity: 1;
				background: rgba(255, 255, 255, 0.2);
				transform: scale(1.1);
			}

			.jv-zoom-btn:before {
				content: '';
				display: block;
				width: 0;
				height: 0;
				border: medium inset transparent;
				border-top-width: 21px;
				border-bottom-width: 21px;
			}

			.jv-zoom-btn.jv-left-btn:before {
				border-right: 27px solid white;
			}

			.jv-zoom-btn.jv-right-btn:before {
				border-left: 27px solid white;
			}

			@media (max-width: 1200px) {
				.jv-images-grid {
					grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
					gap: 12px;
				}
			}

			@media (max-width: 768px) {
				#jv-image-container {
					padding: 16px;
					margin: 20px auto;
					width: calc(100% - 32px);
				}

				.jv-section-title {
					font-size: 20px;
				}

				.jv-title-icon {
					width: 24px;
					height: 24px;
				}

				.jv-images-grid {
					grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
					gap: 10px;
				}

				.jv-image {
					height: 120px;
					border-radius: 8px;
				}

				.jv-zoom-btn {
					padding: 15px;
				}

				#jv-zoom-img-desc {
					font-size: 12px;
				}
			}
		`;
		
		const style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = css;
		document.head.appendChild(style);
	}
}

// 自动启动
if (typeof ApiClient !== 'undefined') {
	ExtraFanart.start();
} else {
	// 如果 ApiClient 还未加载，等待页面完全加载后再启动
	document.addEventListener('DOMContentLoaded', () => {
		if (typeof ApiClient !== 'undefined') {
			ExtraFanart.start();
		}
	});
}
