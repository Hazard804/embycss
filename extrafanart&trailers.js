class ExtraFanart {
	static start() {
		// ===== 配置选项 =====
		// 是否启用网络链接容器显示功能（true=显示，false=隐藏）
		this.enableWebLinks = true;
		
		// 是否启用 JavDB 短评功能（true=启用，false=禁用）
		// 启用后会在网络链接旁显示"短评"按钮，首次使用需要输入 JavDB 账号密码
		// 账号密码会加密存储在浏览器本地，不会上传到任何服务器
		this.enableJavdbReviews = true;
		// ===================
		
		// JavDB API 相关
		this.JAVDB_CREDENTIALS_KEY = 'javdb_credentials'; // 加密凭据存储键名
		this.javdbToken = localStorage.getItem('javdb_token') || null;
		this.javdbTokenExpiry = localStorage.getItem('javdb_token_expiry') || null;
		this.reviewsModal = null; // 短评弹窗
		this.credentialsModal = null; // 凭据输入弹窗
		
		// JavDB 缓存配置
		this.JAVDB_CACHE_KEY = 'javdb_cache'; // localStorage 键名
		this.JAVDB_CACHE_MAX_SIZE = 500 * 1024; // 最大缓存大小 500KB
		this.JAVDB_CACHE_MAX_ITEMS = 50; // 最大缓存条目数
		this.JAVDB_CACHE_EXPIRY_HOURS = 24; // 缓存过期时间（小时）
		this.javdbCache = this.loadJavdbCache(); // 从 localStorage 加载缓存
		
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
		// 新增：记录页面加载方式和缓存的数据
		this.isPageRefresh = true; // 标记是否为页面刷新
		this.cachedSimilarItems = new Map(); // 缓存相似影片数据
		this.cachedCodes = new Map(); // 缓存提取的番号
		this.cachedImages = new Map(); // 缓存剧照数据 {endImageIndex, trailerUrl, imageTagMap}
		this.cachedActorItems = new Map(); // 缓存演员作品数据

		this.imageContainer = this.createImageContainer();
		this.zoomedMask = this.createZoomedMask();
		this.videoPlayer = this.createVideoPlayer();
		this.similarContainer = this.createSimilarContainer();

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
		// 使用与原生Emby一致的类名结构
		container.className = 'imageSection itemsContainer padded-left padded-left-page padded-right vertical-wrap';
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

	static createSimilarContainer() {
		const container = document.createElement('div');
		container.id = 'jv-similar-container';
		// 使用与原生Emby一致的类名结构
		container.className = 'imageSection itemsContainer padded-left padded-left-page padded-right vertical-wrap';
		container.style.display = 'none'; // 初始隐藏，等内容加载完成后再显示
		container.innerHTML = `
			<div class="jv-section-header">
				<h2 class="jv-section-title jv-similar-title">
					<svg class="jv-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="7" height="7"></rect>
						<rect x="14" y="3" width="7" height="7"></rect>
						<rect x="14" y="14" width="7" height="7"></rect>
						<rect x="3" y="14" width="7" height="7"></rect>
					</svg>
					相似影片
				</h2>
			</div>
			<div class="jv-similar-scroll-container">
				<button class="jv-scroll-btn jv-scroll-left" style="display:none;">‹</button>
				<div class="jv-similar-grid"></div>
				<button class="jv-scroll-btn jv-scroll-right">›</button>
			</div>
		`;
		return container;
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
			const isYouTube = this.isYouTubeUrl(this.trailerUrl);
			this.openVideoPlayer(this.trailerUrl, isYouTube);
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
		
		// 检查是否还在详情页
		if (!this.isDetailsPage()) {
			console.log('[ExtraFanart] 已离开详情页，取消显示剧照容器');
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
			// 延迟重试，因为页面可能还在加载
			setTimeout(() => this.showContainer(imageCount), 200);
			return;
		}
		
		// 确保容器在正确的详情页DOM中
		const detailPage = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
		const isInCorrectPage = detailPage && detailPage.contains(this.imageContainer);
		
		// 如果容器不在正确的详情页中，需要重新插入
		if (!isInCorrectPage && this.imageContainer.parentNode) {
			this.imageContainer.parentNode.removeChild(this.imageContainer);
		}
		
		// 检查容器是否已经在DOM中
		if (!document.body.contains(this.imageContainer)) {
			// 直接插入到锚点元素之后
			anchorElement.insertAdjacentElement('afterend', this.imageContainer);
		}
		
		// 内容加载完成，显示容器
		this.imageContainer.style.display = 'block';
		// 标记容器属于哪个 itemId
		this.imageContainer.setAttribute('data-item-id', this.itemId);
		console.log('[ExtraFanart] 剧照容器已显示, itemId:', this.itemId);
	}

static isDetailsPage() {
	return location.hash.includes('/details?id=') || location.hash.includes('/item?id=');
}	static async getItemDetails(itemId) {
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
		
		// 检查是否为同一个项目的重复加载
		const isSameItem = this.itemId === currentItemId;
		
	console.log('[ExtraFanart] loadImages 调用', {
		currentItemId,
		isSameItem,
		isPageRefresh: this.isPageRefresh,
		isLoading: this.isLoading,
		hasCache: this.cachedSimilarItems.has(currentItemId)
	});
	
	// 防抖：如果正在加载中，跳过
	if (this.isLoading) {
		console.log('[ExtraFanart] 正在加载中，跳过');
		return;
	}
	
	// 如果是同一个项目且不是页面刷新，确保容器可见
	if (isSameItem && !this.isPageRefresh) {
		console.log('[ExtraFanart] 页面内导航，同一项目，确保容器可见');
		
		// 确保剧照容器在DOM中且可见且在正确位置
		const detailPage = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
		const imageInCorrectPage = this.imageContainer && detailPage && detailPage.contains(this.imageContainer);
		
		if (!imageInCorrectPage) {
			console.log('[ExtraFanart] 剧照容器需要恢复');
			this.showContainer(this.endImageIndex);
		}
		
		// 延迟恢复相似影片、演员作品和番号，确保剧照容器先稳定
		setTimeout(() => {
			// 再次检查 itemId，确保没有切换到其他页面
			if (this.itemId !== currentItemId) return;
			
			// 再次确认剧照容器在正确位置
			const detailPageCheck = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
			const imageContainerReady = this.imageContainer && 
			                            detailPageCheck && 
			                            detailPageCheck.contains(this.imageContainer) &&
			                            this.imageContainer.style.display === 'block';
			
			if (!imageContainerReady) {
				console.log('[ExtraFanart] 剧照容器未就绪，取消恢复其他容器');
				return;
			}
			
			// 检查并恢复相似影片、演员作品和番号容器（如果有缓存且不在DOM中）
			const hasSimilarCache = this.cachedSimilarItems.has(currentItemId);
			const hasActorCache = this.cachedActorItems.has(currentItemId);
			const hasCodeCache = this.cachedCodes.has(currentItemId);
			
			// 如果有缓存，检查容器是否需要恢复显示
			// 注意：相似影片和演员作品需要按顺序恢复，避免DOM查找冲突
			if (hasSimilarCache) {
				const detailPage = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
				const inCorrectPage = this.similarContainer && detailPage && detailPage.contains(this.similarContainer);
				const isVisible = this.similarContainer && this.similarContainer.style.display === 'block';
				const needsRestore = !inCorrectPage || !isVisible;
				
				if (needsRestore) {
					console.log('[ExtraFanart] 相似影片容器需要恢复', { inCorrectPage, isVisible });
					this.displayCachedSimilarItems(currentItemId);
				}
			}
			
			if (hasActorCache) {
				// 检查是否有任何演员容器在正确的详情页中且可见
				const detailPage = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
				let anyActorVisible = false;
				
				for (let i = 0; i < 3; i++) {
					const containerId = i === 0 ? 'jv-actor-container' : `jv-actor-container-${i}`;
					const actorContainer = document.querySelector(`#${containerId}`);
					if (actorContainer && 
					    detailPage && detailPage.contains(actorContainer) && 
					    actorContainer.style.display === 'block') {
						anyActorVisible = true;
						break;
					}
				}
				
				if (!anyActorVisible) {
					console.log('[ExtraFanart] 演员作品容器需要恢复');
					// 再延迟一点，让相似影片先完成插入，避免DOM查找冲突
					setTimeout(() => {
						// 再次检查 itemId 是否还匹配
						if (this.itemId === currentItemId) {
							this.displayCachedActorItems(currentItemId);
						}
					}, 50);
				}
			}
			
			// 恢复番号和网络链接（如果有缓存且不在DOM中）
			if (hasCodeCache) {
				console.log('[ExtraFanart] 检查番号和网络链接是否需要恢复');
				// 检查番号元素是否存在
				const titleSelectors = [
					'.detailPagePrimaryContainer h1',
					'.itemView:not(.hide) .nameContainer .itemName',
					'.detailPagePrimaryContainer .itemName',
					'#itemDetailPage:not(.hide) .nameContainer .itemName',
					'.nameContainer .itemName',
					'.detailPageContent h1',
					'.detailPagePrimaryTitle',
					'.detailPageWatchContainer + div h1',
					'.detailPageWatchContainer ~ div h1',
					'.mainDetailButtons + div h1',
					'div[data-role="page"]:not(.hide) h1',
					'div[data-role="page"]:not(.hide) .itemName',
					'.page:not(.hide) h1',
					'.page:not(.hide) .itemName',
					'h1',
					'.itemName'
				];
				
				let titleElement = null;
				for (const selector of titleSelectors) {
					const el = document.querySelector(selector);
					if (el && el.textContent.trim()) {
						titleElement = el;
						break;
					}
				}
				
				if (titleElement) {
					const existingCode = titleElement.querySelector('.jv-copy-code');
					const existingLinksContainer = titleElement.parentElement?.querySelector('.jv-web-links-container');
					const cachedCodeInfo = this.cachedCodes.get(currentItemId);
					
					// 如果番号或网络链接缺失，重新显示
					if (!existingCode || (this.enableWebLinks && cachedCodeInfo.webLinks && cachedCodeInfo.webLinks.length > 0 && !existingLinksContainer)) {
						console.log('[ExtraFanart] 番号或网络链接缺失，重新显示', { hasCode: !!existingCode, hasLinks: !!existingLinksContainer });
						this.displayCachedCode(currentItemId);
					}
				}
			}
		}, 150);
		
		return;
	}	this.isLoading = true;
	
	try {
		// 先更新itemId
		const oldItemId = this.itemId;
		this.itemId = currentItemId;
		
		// 如果切换到新的itemId，立即隐藏所有旧容器，防止显示旧内容
		if (oldItemId !== currentItemId) {
			console.log('[ExtraFanart] 切换itemId，隐藏旧容器');
			if (this.similarContainer) {
				this.similarContainer.style.display = 'none';
			}
			// 隐藏所有演员容器
			for (let i = 0; i < 3; i++) {
				const containerId = i === 0 ? '#jv-actor-container' : `#jv-actor-container-${i}`;
				const actorContainer = document.querySelector(containerId);
				if (actorContainer) {
					actorContainer.style.display = 'none';
				}
			}
		}
		
		// 检查各个模块的缓存状态
		const hasImageCache = this.cachedImages.has(currentItemId);
		const hasSimilarCache = this.cachedSimilarItems.has(currentItemId);
		const hasCodeCache = this.cachedCodes.has(currentItemId);
		const hasActorCache = this.cachedActorItems.has(currentItemId);
		
		// 如果不是页面刷新且有剧照缓存，使用缓存
		if (!this.isPageRefresh && hasImageCache) {
			console.log('[ExtraFanart] 使用缓存的剧照数据');
			this.restoreCachedImages(currentItemId);
		} else {
			console.log('[ExtraFanart] 加载新的剧照数据');
			// 清空旧数据
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
			
			// 获取到预告片后立即预加载
			if (this.trailerUrl) {
				this.trailerPreloaded = false;
				setTimeout(() => this.preloadTrailer(), 100);
			}
			
			await this.appendImagesToContainer(this.endImageIndex);
			
			// 只有当有剧照或预告片时才显示容器
			if (this.endImageIndex > 0 || this.trailerUrl) {
				this.showContainer(this.endImageIndex);
			}
			
			// 缓存剧照数据
			this.cachedImages.set(currentItemId, {
				endImageIndex: this.endImageIndex,
				trailerUrl: this.trailerUrl,
				imageTagMap: new Map(this.imageTagMap)
			});
			console.log('[ExtraFanart] 剧照数据已缓存');
		}
			
			// 并行加载相似影片、番号和演员作品，有缓存用缓存，没有就加载
		setTimeout(() => {
			const promises = [];
			
			// 相似影片
			if (!this.isPageRefresh && hasSimilarCache) {
				console.log('[ExtraFanart] 使用缓存的相似影片');
				this.displayCachedSimilarItems(currentItemId);
			} else {
				console.log('[ExtraFanart] 加载新的相似影片');
				promises.push(this.loadSimilarItems().catch(err => console.error('[ExtraFanart] 相似影片加载失败:', err)));
			}
			
			// 番号提取
			if (!this.isPageRefresh && hasCodeCache) {
				console.log('[ExtraFanart] 使用缓存的番号');
				this.displayCachedCode(currentItemId);
			} else {
				console.log('[ExtraFanart] 提取新的番号');
				promises.push(this.extractAndDisplayCode().catch(err => console.error('[ExtraFanart] 番号提取失败:', err)));
			}
			
			// 演员作品
			if (!this.isPageRefresh && hasActorCache) {
				console.log('[ExtraFanart] 使用缓存的演员作品');
				this.displayCachedActorItems(currentItemId);
			} else {
				console.log('[ExtraFanart] 加载新的演员作品');
				promises.push(this.loadActorMoreItems().catch(err => console.error('[ExtraFanart] 演员作品加载失败:', err)));
			}
			
			if (promises.length > 0) {
				Promise.all(promises);
			}
		}, 200);
			
			console.log('[ExtraFanart] 加载完成');
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
		// 监听页面显示事件（页面内导航）
		document.addEventListener('viewshow', () => {
			if (!ExtraFanart.isLoading) {
				console.log('[ExtraFanart] viewshow事件触发，页面内导航');
				// 标记为非刷新方式（页面内导航）
				ExtraFanart.isPageRefresh = false;
				setTimeout(() => ExtraFanart.loadImages(), 100);
				setTimeout(() => ExtraFanart.loadImages(), 400);
			}
		});
		
		// 监听 URL hash 变化（页面内导航）
		window.addEventListener('hashchange', () => {
			if (!ExtraFanart.isLoading) {
				console.log('[ExtraFanart] hashchange事件触发，页面内导航');
				// 标记为非刷新方式（页面内导航）
				ExtraFanart.isPageRefresh = false;
				setTimeout(() => ExtraFanart.loadImages(), 100);
			}
		});
		
		// 监听页面卸载前事件，用于检测真正的页面刷新
		window.addEventListener('beforeunload', () => {
			sessionStorage.setItem('jv-page-refreshed', 'true');
		});
		
		// 检查是否为页面刷新
		if (sessionStorage.getItem('jv-page-refreshed') === 'true') {
			console.log('[ExtraFanart] 检测到页面刷新');
			ExtraFanart.isPageRefresh = true;
			sessionStorage.removeItem('jv-page-refreshed');
		}
		
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

	static async openVideoPlayer(trailerUrl, isYouTube) {
		if (!trailerUrl) return;
		
		const videoElement = this.videoPlayer.querySelector('#jv-video');
		const iframeElement = this.videoPlayer.querySelector('#jv-video-iframe');
		const videoContent = this.videoPlayer.querySelector('.jv-video-content');
		
		if (isYouTube) {
			// 使用 iframe 播放 YouTube 视频
			const embedUrl = this.convertYouTubeUrl(trailerUrl);
			if (embedUrl) {
				videoElement.style.display = 'none';
				iframeElement.style.display = 'block';
				iframeElement.src = embedUrl;
			}
		} else {
			// 使用 video 标签播放普通视频
			videoElement.style.display = 'block';
			iframeElement.style.display = 'none';
			const video = this.videoPlayer.querySelector('#jv-video source');
			video.src = trailerUrl;
			videoElement.load();
			// 默认静音播放
			videoElement.muted = true;
			videoElement.defaultMuted = true;
			videoElement.volume = 0;
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
	}

	// 相似影片功能
	static async loadSimilarItems() {
		if (!this.itemId || typeof ApiClient === 'undefined') return;
		
		// 立即隐藏容器，避免显示旧内容或空白框
		if (this.similarContainer) {
			this.similarContainer.style.display = 'none';
			this.similarContainer.removeAttribute('data-item-id');
		}
		
		// 检查是否还在详情页
		if (!this.isDetailsPage()) {
			console.log('[ExtraFanart] 已离开详情页，取消加载相似影片');
			return;
		}
		
		try {
			const item = await ApiClient.getItem(ApiClient.getCurrentUserId(), this.itemId);
			if (!item || item.Type !== 'Movie') return;
			
			const options = {
				Limit: 50,
				UserId: ApiClient.getCurrentUserId(),
				ImageTypeLimit: 1,
				Fields: "BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Status,EndDate,LocalTrailerCount,RemoteTrailers",
				EnableTotalRecordCount: false
			};
			
			const result = await ApiClient.getSimilarItems(this.itemId, options);
			if (!result || !result.Items || result.Items.length === 0) return;
			
			// 带权重的随机排序
			const weightFactor = -0.1;
			const shuffled = result.Items
				.map((item, index) => ({
					item,
					sortKey: Math.random() + index * weightFactor
				}))
				.sort((a, b) => a.sortKey - b.sortKey)
				.map(entry => entry.item)
				.slice(0, 24);
			
		// 保存加载时的 itemId，用于后续检查
		const loadedItemId = this.itemId;
		
		// 无论是否在详情页，都先缓存数据，以便返回时恢复
		this.cachedSimilarItems.set(loadedItemId, shuffled);
		console.log('[ExtraFanart] 相似影片已缓存');
		
		// 检查是否还在详情页（异步加载期间用户可能离开）
		if (!this.isDetailsPage()) {
			console.log('[ExtraFanart] 加载完成后检查：已离开详情页，数据已缓存但取消显示');
			return;
		}
		
		// 最终检查：确保 itemId 没有变化（用户可能快速切换页面）
		if (this.itemId !== loadedItemId) {
			console.log('[ExtraFanart] itemId已变化，取消显示相似影片', { loaded: loadedItemId, current: this.itemId });
			return;
		}
		
		this.displaySimilarItems(shuffled);
	} catch (error) {
		console.error('[ExtraFanart] 加载相似影片失败:', error);
	}
}	static restoreCachedImages(itemId) {
		const cachedData = this.cachedImages.get(itemId);
		if (!cachedData) {
			console.log('[ExtraFanart] 没有找到缓存的剧照数据');
			return;
		}
		
	console.log('[ExtraFanart] 恢复缓存的剧照数据');
	
	// 检查是否是同一个 itemId（避免显示错误的内容）
	const isSameItem = this.itemId === itemId;
	console.log('[ExtraFanart] itemId 检查:', { currentItemId: this.itemId, targetItemId: itemId, isSameItem });
	
	// 恢复数据
	this.endImageIndex = cachedData.endImageIndex;
	this.trailerUrl = cachedData.trailerUrl;
	this.imageTagMap = new Map(cachedData.imageTagMap);
	this.itemId = itemId;
	
	// 检查剧照容器是否已经存在且有内容
	const gridContainer = this.imageContainer.querySelector('.jv-images-grid');
	const hasContent = gridContainer && gridContainer.children.length > 0;
	const isVisible = this.imageContainer.style.display === 'block' || this.imageContainer.style.display === '';
	// 检查容器是否真正在详情页的DOM中
	const detailPage = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
	const inDOM = detailPage && detailPage.contains(this.imageContainer);
	
	console.log('[ExtraFanart] 剧照容器状态:', { hasContent, isVisible, inDOM, childCount: gridContainer?.children.length });
	
	// 只有在是同一个项目且容器正确显示时才跳过渲染
	if (isSameItem && hasContent && isVisible && inDOM) {
		console.log('[ExtraFanart] 剧照容器已存在且有内容，跳过重新渲染');
		return;
	}
	
	console.log('[ExtraFanart] 需要重新显示容器到详情页');		console.log('[ExtraFanart] 重新构建剧照容器');
		
		// 清空并重建
		this.imageMap.clear();
		if (gridContainer) {
			gridContainer.innerHTML = '';
		}
		
		// 重新创建图片元素
		const imageFragment = document.createDocumentFragment();
		
		// 如果有预告片，先添加预告片
		if (this.trailerUrl) {
			const trailerElement = this.createTrailerElement();
			imageFragment.appendChild(trailerElement);
		}
		
		for (let index = this.startImageIndex; index <= this.endImageIndex; index++) {
			const imageElement = this.createImageElement(index);
			imageFragment.appendChild(imageElement);
			this.imageMap.set(index, imageElement);
		}
		
		if (gridContainer) {
			gridContainer.appendChild(imageFragment);
		}
		
		// 更新图片数量显示
		const countElement = this.imageContainer.querySelector('.jv-image-count');
		if (countElement) {
			const totalImages = this.endImageIndex - this.startImageIndex + 1;
			const totalText = this.trailerUrl ? `预告片 + ${totalImages} 张` : `共 ${totalImages} 张`;
			countElement.textContent = totalText;
		}
		
		// 显示容器（会自动重试）
		this.showContainer(this.endImageIndex);
		
		console.log('[ExtraFanart] 剧照容器恢复完成');
	}

	static displayCachedSimilarItems(itemId) {
		// 检查 itemId 是否匹配，防止显示错误的缓存
		if (this.itemId !== itemId) {
			console.log('[ExtraFanart] itemId不匹配，取消显示缓存的相似影片', { cached: itemId, current: this.itemId });
			return;
		}
		
		const cachedItems = this.cachedSimilarItems.get(itemId);
		if (!cachedItems) {
			console.log('[ExtraFanart] 没有找到缓存的相似影片');
			return;
		}
		
		// 立即隐藏容器，防止显示旧内容
		if (this.similarContainer) {
			this.similarContainer.style.display = 'none';
			this.similarContainer.removeAttribute('data-item-id');
		}
		
		console.log('[ExtraFanart] 显示相似影片容器（缓存）');
		this.displaySimilarItems(cachedItems);
	}

	static displaySimilarItems(items) {
		if (!items || items.length === 0) return;
		
		// 检查是否还在详情页
		if (!this.isDetailsPage()) {
			console.log('[ExtraFanart] 已离开详情页，取消显示相似影片');
			return;
		}
		
		const gridContainer = this.similarContainer.querySelector('.jv-similar-grid');
		if (!gridContainer) return;
		
		// 立即隐藏容器，防止显示旧内容
		this.similarContainer.style.display = 'none';
		
		// 早期检查：如果容器已显示且itemId匹配，且有内容，则跳过
		const containerItemId = this.similarContainer.getAttribute('data-item-id');
		if (containerItemId === this.itemId && 
		    gridContainer.children.length > 0) {
			const detailPage = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
			if (detailPage && detailPage.contains(this.similarContainer)) {
				console.log('[ExtraFanart] 相似影片容器已正确显示，跳过');
				this.similarContainer.style.display = 'block'; // 恢复显示
				return;
			}
		}
		
		// 强制清空，确保显示新内容
		gridContainer.innerHTML = '';
		console.log('[ExtraFanart] 清空相似影片容器，准备添加', items.length, '个影片');
		
		// 添加内容到容器（此时容器仍然隐藏）
		
		items.forEach(item => {
			const card = this.createSimilarCard(item);
			gridContainer.appendChild(card);
		});
		
		// 确保容器在正确的详情页DOM中
		const detailPage = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
		const isInCorrectPage = detailPage && detailPage.contains(this.similarContainer);
		
		console.log('[ExtraFanart] 相似影片容器DOM检查:', {
			detailPageExists: !!detailPage,
			containerInDOM: document.body.contains(this.similarContainer),
			containerInCorrectPage: isInCorrectPage
		});
		
		// 如果容器不在正确的详情页中，需要重新插入
		if (!isInCorrectPage && this.similarContainer.parentNode) {
			console.log('[ExtraFanart] 容器在错误位置，移除后重新插入');
			this.similarContainer.parentNode.removeChild(this.similarContainer);
		}
		
		// 找到剧照容器或原剧照容器应在的位置并插入相似影片
		const detailPageForInsert = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
		const imageContainer = detailPageForInsert ? detailPageForInsert.querySelector('#jv-image-container') : null;
		const actorContainer = detailPageForInsert ? detailPageForInsert.querySelector('#jv-actor-container') : null;
		
		console.log('[ExtraFanart] 相似影片插入位置检查:', {
			hasDetailPage: !!detailPageForInsert,
			hasImageContainer: !!imageContainer,
			hasActorContainer: !!actorContainer
		});
		
		// 插入逻辑：如果演员作品已存在（先加载完成），插入到最后一个演员容器后面；否则插到剧照后面
		if (imageContainer && document.body.contains(imageContainer)) {
			// 如果有剧照容器
			if (actorContainer && document.body.contains(actorContainer)) {
				// 如果演员作品已经存在（先完成），查找最后一个演员容器
				let lastActorContainer = actorContainer;
				let nextIndex = 1;
				while (true) {
					const nextActorContainer = detailPageForInsert.querySelector(`#jv-actor-container-${nextIndex}`);
					if (nextActorContainer && document.body.contains(nextActorContainer)) {
						lastActorContainer = nextActorContainer;
						nextIndex++;
					} else {
						break;
					}
				}
				
				// 插入到最后一个演员容器后面
				if (!document.body.contains(this.similarContainer)) {
					lastActorContainer.insertAdjacentElement('afterend', this.similarContainer);
					console.log('[ExtraFanart] 相似影片插入到演员作品之后（演员作品先完成）');
				} else if (this.similarContainer.previousElementSibling !== lastActorContainer) {
					lastActorContainer.insertAdjacentElement('afterend', this.similarContainer);
					console.log('[ExtraFanart] 相似影片移动到演员作品之后（演员作品先完成）');
				}
			} else {
				// 演员作品还没加载，直接插到剧照后面
				if (!document.body.contains(this.similarContainer)) {
					imageContainer.insertAdjacentElement('afterend', this.similarContainer);
					console.log('[ExtraFanart] 相似影片插入到剧照之后（演员作品未加载）');
				} else if (this.similarContainer.previousElementSibling !== imageContainer) {
					imageContainer.insertAdjacentElement('afterend', this.similarContainer);
					console.log('[ExtraFanart] 相似影片移动到剧照之后（演员作品未加载）');
				}
			}
		} else {
			// 延迟重试，因为剧照容器可能还在加载
			setTimeout(() => {
				const retryImageContainer = document.querySelector('#jv-image-container');
				if (retryImageContainer && !document.body.contains(this.similarContainer)) {
					retryImageContainer.insertAdjacentElement('afterend', this.similarContainer);
					this.similarContainer.style.display = 'block';
				}
			}, 300);
			
			// 尝试插入到演职人员区域后面（原剧照应该在的位置）
			const castSection = document.querySelector('#itemDetailPage:not(.hide) #castCollapsible') ||
			                    document.querySelector('.itemView:not(.hide) .peopleSection');
			
			if (castSection) {
				if (!document.body.contains(this.similarContainer)) {
					castSection.insertAdjacentElement('afterend', this.similarContainer);
				}
			} else {
				// 如果连演职人员区域也没有，尝试插入到主内容区域
				const mainContent = document.querySelector('#itemDetailPage:not(.hide)') || 
				                    document.querySelector('.itemView:not(.hide)') ||
				                    document.querySelector('.page:not(.hide)');
				
				if (mainContent && !document.body.contains(this.similarContainer)) {
					mainContent.appendChild(this.similarContainer);
				} else {
					console.warn('[ExtraFanart] 未找到合适的容器位置，相似影片将不显示');
					return;
				}
			}
		}
		
		// 内容加载完成，显示容器
		this.similarContainer.style.display = 'block';
		// 标记容器属于哪个 itemId
		this.similarContainer.setAttribute('data-item-id', this.itemId);
		console.log('[ExtraFanart] 相似影片容器已显示, itemId:', this.itemId);
		
		// 添加刷新功能
		const titleElement = this.similarContainer.querySelector('.jv-similar-title');
		if (titleElement) {
			titleElement.style.cursor = 'pointer';
			titleElement.title = '点击刷新';
			titleElement.onclick = () => this.loadSimilarItems();
		}
		
		// 添加横向滚动功能
		this.setupScrollButtons();
		
		// 立即添加悬停预告片功能，无需延迟
		this.addHoverTrailerEffect();
	}

	static createSimilarCard(item) {
		const card = document.createElement('div');
		card.className = 'jv-similar-card';
		card.dataset.itemId = item.Id;
		card.dataset.localTrailerCount = item.LocalTrailerCount || 0;
		
		// 优先使用横版封面
		let imgUrl = '';
		if (item.ImageTags && item.ImageTags.Thumb) {
			imgUrl = ApiClient.getImageUrl(item.Id, {
				type: 'Thumb',
				tag: item.ImageTags.Thumb,
				maxHeight: 360,
				maxWidth: 640
			});
		} else if (item.ImageTags && item.ImageTags.Primary) {
			imgUrl = ApiClient.getImageUrl(item.Id, {
				type: 'Primary',
				tag: item.ImageTags.Primary,
				maxHeight: 330,
				maxWidth: 220
			});
		}
		
		const year = item.ProductionYear || '';
		const name = item.Name || '';
		// 使用 RemoteTrailers 判断是否有预告片
		const hasTrailer = (item.RemoteTrailers && item.RemoteTrailers.length > 0) || (item.LocalTrailerCount || 0) > 0;
		
		card.innerHTML = `
			<div class="jv-similar-card-image ${hasTrailer ? 'has-trailer' : ''}">
				<img src="${imgUrl}" alt="${name}" loading="lazy" />
				<div class="jv-card-overlay"></div>
			</div>
			<div class="jv-similar-card-info">
				<div class="jv-similar-card-name" title="${name}">${name}</div>
				<div class="jv-similar-card-year">${year}</div>
			</div>
		`;
		
		card.onclick = () => {
			// 跳转到详情页
			if (typeof Emby !== 'undefined' && Emby.Page && Emby.Page.showItem) {
				Emby.Page.showItem(item.Id);
			} else {
				window.location.hash = `#!/item?id=${item.Id}`;
			}
		};
		
		return card;
	}

	static setupScrollButtons() {
		const scrollContainer = this.similarContainer.querySelector('.jv-similar-scroll-container');
		const grid = this.similarContainer.querySelector('.jv-similar-grid');
		const leftBtn = this.similarContainer.querySelector('.jv-scroll-left');
		const rightBtn = this.similarContainer.querySelector('.jv-scroll-right');
		
		if (!scrollContainer || !grid || !leftBtn || !rightBtn) return;
		
		const scrollAmount = 400;
		
		const updateButtons = () => {
			const scrollLeft = grid.scrollLeft;
			const maxScroll = grid.scrollWidth - grid.clientWidth;
			
			leftBtn.style.display = scrollLeft > 0 ? 'flex' : 'none';
			rightBtn.style.display = scrollLeft < maxScroll - 10 ? 'flex' : 'none';
		};
		
		leftBtn.onclick = () => {
			grid.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
			setTimeout(updateButtons, 300);
		};
		
		rightBtn.onclick = () => {
			grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
			setTimeout(updateButtons, 300);
		};
		
		grid.addEventListener('scroll', updateButtons);
		updateButtons();
	}

	static addHoverTrailerEffect() {
		// 如果是触摸设备，不添加悬停效果
		if ('ontouchstart' in window) return;
		if (!this.similarContainer) return;
		
		const cards = this.similarContainer.querySelectorAll('.jv-similar-card');
		
		cards.forEach((card, index) => {
			const imageContainer = card.querySelector('.jv-similar-card-image');
			const hasTrailer = imageContainer && imageContainer.classList.contains('has-trailer');
			
			if (!imageContainer || !hasTrailer) return;
			
			const img = imageContainer.querySelector('img');
			const overlay = imageContainer.querySelector('.jv-card-overlay');
			const itemId = card.dataset.itemId;
			
			let isHovered = false;
			let videoElement = null;
			let expandBtn = null;
			let currentTrailerUrl = null;
			
			card.addEventListener('mouseenter', () => {
				isHovered = true;
				img.style.filter = 'blur(5px)';
				
				// 异步加载预告片
				ExtraFanart.getTrailerUrlForHover(itemId).then(trailerUrl => {
					if (!isHovered || !trailerUrl) return;
					
					currentTrailerUrl = trailerUrl;
					
					// 检查是否是 YouTube 链接
					const isYouTube = ExtraFanart.isYouTubeUrl(trailerUrl);
					
					// 创建放大按钮
					expandBtn = document.createElement('button');
					expandBtn.className = 'jv-expand-btn';
					expandBtn.innerHTML = `
						<svg viewBox="0 0 24 24" width="20" height="20" fill="white">
							<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
						</svg>
					`;
					expandBtn.style.cssText = `
						position: absolute;
						top: 8px;
						right: 8px;
						width: 32px;
						height: 32px;
						background: rgba(0, 0, 0, 0.6);
						border: 1px solid rgba(255, 255, 255, 0.3);
						border-radius: 4px;
						cursor: pointer;
						display: flex;
						align-items: center;
						justify-content: center;
						z-index: 10;
						opacity: 0;
						transition: all 0.2s ease;
						backdrop-filter: blur(4px);
					`;
					expandBtn.title = '全屏播放';
					
					expandBtn.onmouseenter = () => {
						expandBtn.style.background = 'rgba(0, 0, 0, 0.8)';
						expandBtn.style.transform = 'scale(1.1)';
					};
					
					expandBtn.onmouseleave = () => {
						expandBtn.style.background = 'rgba(0, 0, 0, 0.6)';
						expandBtn.style.transform = 'scale(1)';
					};
					
					expandBtn.onclick = (e) => {
						e.stopPropagation();
						console.log('[ExtraFanart] 放大按钮被点击（相似影片）', { trailerUrl: currentTrailerUrl, isYouTube });
						// 打开全屏播放器
						ExtraFanart.openVideoPlayer(currentTrailerUrl, isYouTube);
					};
					
					// 将按钮添加到 imageContainer 而不是 overlay，避免层级问题
					imageContainer.appendChild(expandBtn);
					
					// 延迟显示按钮
					setTimeout(() => {
						if (expandBtn && isHovered) {
							expandBtn.style.opacity = '1';
						}
					}, 300);
					
					if (isYouTube) {
						// 使用 iframe 播放 YouTube 视频
						const embedUrl = ExtraFanart.convertYouTubeUrl(trailerUrl);
						
						if (embedUrl) {
							videoElement = document.createElement('iframe');
							videoElement.src = embedUrl;
							videoElement.frameBorder = '0';
							videoElement.allow = 'autoplay; encrypted-media';
							videoElement.setAttribute('disablePictureInPicture', 'true');
							videoElement.style.cssText = `
								position: absolute;
								top: 0;
								left: 0;
								width: 100%;
								height: 100%;
								border: none;
								opacity: 0;
								transition: opacity 0.3s ease;
								z-index: 2;
								pointer-events: auto;
							`;
							overlay.appendChild(videoElement);
							
							if (isHovered) {
								setTimeout(() => {
									if (videoElement) {
										videoElement.style.opacity = '1';
									}
								}, 50);
							}
						}
					} else {
						// 使用 video 标签播放普通视频
						videoElement = document.createElement('video');
						videoElement.src = trailerUrl;
						videoElement.autoplay = true;
						videoElement.loop = true;
						videoElement.playsInline = true;
						videoElement.controls = true;
						videoElement.disablePictureInPicture = true;
						videoElement.controlsList = 'nodownload nofullscreen noremoteplayback';
						// 默认静音播放
						videoElement.muted = true;
						videoElement.defaultMuted = true;
						videoElement.volume = 0;
						videoElement.style.cssText = `
							position: absolute;
							top: 0;
							left: 0;
							width: 100%;
							height: 100%;
							object-fit: cover;
							opacity: 0;
							transition: opacity 0.3s ease;
							z-index: 2;
						`;
						
						// 监听音量变化，只在用户主动操作时记录
						let userInteracted = false;
						videoElement.addEventListener('volumechange', function() {
							if (userInteracted) {
								if (!this.muted && this.volume > 0) {
									localStorage.setItem('jv-trailer-volume', this.volume);
									localStorage.setItem('jv-trailer-muted', 'false');
								} else if (this.muted) {
									localStorage.setItem('jv-trailer-muted', 'true');
								}
							}
						});
						
						// 标记用户交互
						videoElement.addEventListener('click', function() { userInteracted = true; });
						videoElement.addEventListener('mousedown', function() { userInteracted = true; });
						
						// 延迟恢复用户设置，避免初始化时触发
						setTimeout(() => {
							if (videoElement) {
								const savedVolume = localStorage.getItem('jv-trailer-volume');
								const savedMuted = localStorage.getItem('jv-trailer-muted');
								if (savedMuted === 'false' && savedVolume) {
									videoElement.muted = false;
									videoElement.volume = parseFloat(savedVolume);
								}
								userInteracted = true; // 设置完成后允许记录变化
							}
						}, 100);
						
						overlay.appendChild(videoElement);
						
						if (isHovered) {
							setTimeout(() => {
								if (videoElement) {
									videoElement.style.opacity = '1';
								}
							}, 50);
						}
					}
				});
			});
			
			card.addEventListener('mouseleave', () => {
				isHovered = false;
				img.style.filter = '';
				
				if (videoElement) {
					videoElement.remove();
					videoElement = null;
				}
				
				if (expandBtn && expandBtn.parentNode) {
					expandBtn.parentNode.removeChild(expandBtn);
					expandBtn = null;
				}
				
				currentTrailerUrl = null;
			});
		});
	}

	static async getTrailerUrlForHover(itemId) {
		const cacheKey = `trailerUrl_${itemId}`;
		let videoUrl = localStorage.getItem(cacheKey);
		
		if (videoUrl) return videoUrl;
		if (typeof ApiClient === 'undefined') return null;
		
		try {
			const item = await ApiClient.getItem(ApiClient.getCurrentUserId(), itemId);
			
			// 优先使用 RemoteTrailers（远程预告片）
			if (item.RemoteTrailers && item.RemoteTrailers.length > 0) {
				videoUrl = item.RemoteTrailers[0].Url;
				localStorage.setItem(cacheKey, videoUrl);
				return videoUrl;
			}
			
			// 降级方案：使用本地预告片
			const localTrailers = await ApiClient.getLocalTrailers(ApiClient.getCurrentUserId(), itemId);
			
			if (localTrailers && localTrailers.length > 0) {
				const trailerItem = await ApiClient.getItem(ApiClient.getCurrentUserId(), localTrailers[0].Id);
				
				// 获取流URL
				const mediaSource = trailerItem.MediaSources && trailerItem.MediaSources[0];
				if (mediaSource) {
					videoUrl = `${ApiClient._serverAddress}/Videos/${trailerItem.Id}/stream?Static=true&MediaSourceId=${mediaSource.Id}&api_key=${ApiClient.accessToken()}`;
					localStorage.setItem(cacheKey, videoUrl);
				}
			}
		} catch (err) {
			console.error('[ExtraFanart] 获取悬停预告片URL失败:', err);
		}
		
		return videoUrl;
	}

	// 番号提取和复制功能
	static async extractAndDisplayCode() {
		if (!this.itemId || typeof ApiClient === 'undefined') return;
		
		// 检查是否还在详情页
		if (!this.isDetailsPage()) {
			console.log('[ExtraFanart] 已离开详情页，取消提取番号');
			return;
		}
		
		try {
			const item = await ApiClient.getItem(ApiClient.getCurrentUserId(), this.itemId);
			if (!item || item.Type !== 'Movie') return;
			
			// 查找标题元素 - 优化选择器查询顺序，最常用的放前面
			const titleSelectors = [
				'.detailPagePrimaryContainer h1',
				'.itemView:not(.hide) .nameContainer .itemName',
				'.detailPagePrimaryContainer .itemName',
				'#itemDetailPage:not(.hide) .nameContainer .itemName',
				'.nameContainer .itemName',
				'.detailPageContent h1',
				'.detailPagePrimaryTitle',
				'.detailPageWatchContainer + div h1',
				'.detailPageWatchContainer ~ div h1',
				'.mainDetailButtons + div h1',
				'div[data-role="page"]:not(.hide) h1',
				'div[data-role="page"]:not(.hide) .itemName',
				'.page:not(.hide) h1',
				'.page:not(.hide) .itemName',
				'h1',
				'.itemName',
				'h1.itemName',
				'h2.itemName',
				'h3.itemName',
				'h2.pageTitle',
				'h1[is="emby-title"]',
				'[is="emby-title"]'
			];
			
			let titleElement = null;
			for (const selector of titleSelectors) {
				const el = document.querySelector(selector);
				if (el && el.textContent.trim()) {
					// 检查是否已经处理过（是否包含 jv-copy-code 类）
					if (el.querySelector('.jv-copy-code')) {
						return; // 已处理过，直接返回
					}
					titleElement = el;
					break;
				}
			}
			
		if (!titleElement) return;
		
		const titleText = titleElement.textContent.trim();
		
		// 提取番号的逻辑
		let code = null;
		let codeStartIndex = -1;
		let codeEndIndex = -1;
		let usesBrackets = true; // 标记是否使用方括号格式
		
		// 方式1：从方括号内提取番号：[ABC-123]
		const bracketMatch = titleText.match(/\[([^\]]+)\]/);
		if (bracketMatch && bracketMatch[1]) {
			code = bracketMatch[1];
			codeStartIndex = titleText.indexOf('[');
			codeEndIndex = titleText.indexOf(']') + 1;
			console.log('[ExtraFanart] 从方括号内提取到番号:', code);
		} else {
			// 方式2：回退方案 - 提取第一个空格之前的内容作为番号
			const spaceIndex = titleText.indexOf(' ');
			if (spaceIndex > 0) {
				code = titleText.slice(0, spaceIndex).trim();
				codeStartIndex = 0;
				codeEndIndex = spaceIndex;
				usesBrackets = false;
				console.log('[ExtraFanart] 从第一个空格前提取到番号:', code);
			} else {
				// 如果没有空格，也没有方括号，说明无法提取番号
				console.log('[ExtraFanart] 无法提取番号，标题格式不符合要求');
				return;
			}
		}
		
		if (!code) return;			// 生成网络链接（仅在启用时）
			let webLinks = [];
			if (this.enableWebLinks) {
				webLinks = this.createWebLinks(code, item);
			}
			
		// 再次检查是否还在详情页（异步加载期间用户可能离开）
		if (!this.isDetailsPage()) {
			console.log('[ExtraFanart] 加载完成后检查：已离开详情页，取消显示番号');
			return;
		}
		
		// 缓存提取的番号信息和网络链接
		this.cachedCodes.set(this.itemId, {
			code: code,
			titleText: titleText,
			codeStartIndex: codeStartIndex,
			codeEndIndex: codeEndIndex,
			webLinks: webLinks,
			usesBrackets: usesBrackets
		});
		console.log('[ExtraFanart] 番号已缓存:', code, '(方括号格式:', usesBrackets + ')');			// 创建可复制的链接元素
			const copyLink = document.createElement('a');
			copyLink.textContent = code;
			copyLink.className = 'jv-copy-code';
			copyLink.title = '点击复制番号';
			copyLink.style.cursor = 'pointer';
			copyLink.style.color = 'lightblue';
			copyLink.style.textDecoration = 'none';
			copyLink.style.transition = 'transform 0.1s ease';
			
			copyLink.onclick = (e) => {
				e.preventDefault();
				this.copyToClipboard(code);
				this.showToast(`已复制: ${code}`);
			};
			
			copyLink.onmousedown = () => {
				copyLink.style.transform = 'scale(0.95)';
			};
			
			copyLink.onmouseup = () => {
				copyLink.style.transform = 'scale(1)';
			};
			
		// 替换标题：根据提取方式选择格式
		const beforeCode = titleText.slice(0, codeStartIndex);
		const afterCode = titleText.slice(codeEndIndex);
		
		titleElement.innerHTML = '';
		if (beforeCode) {
			titleElement.appendChild(document.createTextNode(beforeCode));
		}
		
		if (usesBrackets) {
			// 保留方括号结构
			titleElement.appendChild(document.createTextNode('['));
			titleElement.appendChild(copyLink);
			titleElement.appendChild(document.createTextNode(']'));
		} else {
			// 不使用方括号，直接显示番号
			titleElement.appendChild(copyLink);
		}
		
		if (afterCode) {
			titleElement.appendChild(document.createTextNode(afterCode));
		}			// 插入网络链接到标题下方（仅在启用且有链接时）
			if (this.enableWebLinks && webLinks.length > 0) {
				this.insertWebLinks(titleElement, webLinks);
			}
			
		} catch (error) {
			console.error('[ExtraFanart] 番号提取失败:', error);
		}
	}
	
	static displayCachedCode(itemId) {
		console.log('[ExtraFanart] displayCachedCode 调用', { itemId, hasCache: this.cachedCodes.has(itemId) });
		const cachedCodeInfo = this.cachedCodes.get(itemId);
		if (!cachedCodeInfo) {
			console.log('[ExtraFanart] 没有找到缓存的番号');
			return;
		}
		
	console.log('[ExtraFanart] 找到缓存的番号:', cachedCodeInfo.code);
	
	// 查找标题元素
	const titleSelectors = [
		'.detailPagePrimaryContainer h1',
		'.itemView:not(.hide) .nameContainer .itemName',
		'.detailPagePrimaryContainer .itemName',
		'#itemDetailPage:not(.hide) .nameContainer .itemName',
		'.nameContainer .itemName',
		'.detailPageContent h1',
		'.detailPagePrimaryTitle',
		'.detailPageWatchContainer + div h1',
		'.detailPageWatchContainer ~ div h1',
		'.mainDetailButtons + div h1',
		'div[data-role="page"]:not(.hide) h1',
		'div[data-role="page"]:not(.hide) .itemName',
		'.page:not(.hide) h1',
		'.page:not(.hide) .itemName',
		'h1',
		'.itemName'
	];
	
	let titleElement = null;
	for (const selector of titleSelectors) {
		const el = document.querySelector(selector);
		if (el && el.textContent.trim()) {
			titleElement = el;
			break;
		}
	}
	
	if (!titleElement) {
		console.log('[ExtraFanart] 未找到标题元素');
		return;
	}
	
	// 检查番号是否已经显示
	// 1. 检查是否有我们添加的可点击番号元素
	const existingCode = titleElement.querySelector('.jv-copy-code');
	if (existingCode && existingCode.textContent === cachedCodeInfo.code) {
		console.log('[ExtraFanart] 番号元素已显示在标题中，检查网络链接');
		
		// 只有在启用网络链接时才检查和添加
		if (this.enableWebLinks && cachedCodeInfo.webLinks && cachedCodeInfo.webLinks.length > 0) {
			// 检查网络链接是否已存在
			const existingLinksContainer = titleElement.parentElement.querySelector('.jv-web-links-container');
			if (existingLinksContainer) {
				console.log('[ExtraFanart] 网络链接已存在，跳过重新渲染');
				return;
			} else {
				console.log('[ExtraFanart] 番号存在但缺少网络链接，添加链接');
				this.insertWebLinks(titleElement, cachedCodeInfo.webLinks);
			}
		}
		return;
	}
	
	// 2. 检查标题文本是否已经包含番号（可能是Emby恢复的原始标题）
	const currentTitleText = titleElement.textContent;
	
	// 根据是否使用方括号构建不同的匹配模式
	const hasBrackets = cachedCodeInfo.usesBrackets !== false; // 默认为true，兼容旧缓存
	let codePattern;
	if (hasBrackets) {
		codePattern = new RegExp(`\\[${cachedCodeInfo.code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\]`);
	} else {
		// 无方括号时，匹配番号后跟空格或结尾
		codePattern = new RegExp(`^${cachedCodeInfo.code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:\\s|$)`);
	}
	
	// 如果标题文本完全匹配缓存的标题文本，说明是原始状态，需要添加可点击元素
	// 但为了避免频繁重绘，我们只在真正需要时才渲染
	if (codePattern.test(currentTitleText) && currentTitleText === cachedCodeInfo.titleText) {
		console.log('[ExtraFanart] 标题已恢复原始状态，添加可点击番号元素');
		// 继续执行渲染，添加可点击元素
	} else if (existingCode) {
		// 有可点击元素但内容不匹配，需要更新
		console.log('[ExtraFanart] 番号元素存在但内容不匹配，更新渲染');
	} else if (!codePattern.test(currentTitleText)) {
		// 标题中完全不包含番号
		console.log('[ExtraFanart] 标题中不包含番号，跳过渲染');
		return;
	} else {
		console.log('[ExtraFanart] 标题状态异常，跳过渲染', {
			currentTitleText,
			cachedTitleText: cachedCodeInfo.titleText
		});
		return;
	}
	
	console.log('[ExtraFanart] 开始渲染番号');		if (!titleElement) return;
		
		const { code, titleText, codeStartIndex, codeEndIndex, webLinks, usesBrackets } = cachedCodeInfo;
		
		// 创建可复制的链接元素
		const copyLink = document.createElement('a');
		copyLink.textContent = code;
		copyLink.className = 'jv-copy-code';
		copyLink.title = '点击复制番号';
		copyLink.style.cursor = 'pointer';
		copyLink.style.color = 'lightblue';
		copyLink.style.textDecoration = 'none';
		copyLink.style.transition = 'transform 0.1s ease';
		
		copyLink.onclick = (e) => {
			e.preventDefault();
			this.copyToClipboard(code);
			this.showToast(`已复制: ${code}`);
		};
		
		copyLink.onmousedown = () => {
			copyLink.style.transform = 'scale(0.95)';
		};
		
		copyLink.onmouseup = () => {
			copyLink.style.transform = 'scale(1)';
		};
		
		// 替换标题：根据提取方式选择格式
		const beforeCode = titleText.slice(0, codeStartIndex);
		const afterCode = titleText.slice(codeEndIndex);
		
		titleElement.innerHTML = '';
		if (beforeCode) {
			titleElement.appendChild(document.createTextNode(beforeCode));
		}
		
		if (usesBrackets !== false) {
			// 保留方括号结构（默认行为，兼容旧缓存）
			titleElement.appendChild(document.createTextNode('['));
			titleElement.appendChild(copyLink);
			titleElement.appendChild(document.createTextNode(']'));
		} else {
			// 不使用方括号，直接显示番号
			titleElement.appendChild(copyLink);
		}
		
		if (afterCode) {
			titleElement.appendChild(document.createTextNode(afterCode));
		}
		
		// 插入网络链接（仅在启用且有链接时）
		if (this.enableWebLinks && webLinks && webLinks.length > 0) {
			this.insertWebLinks(titleElement, webLinks);
		}
	}

	// 创建网络链接
	static createWebLinks(code, item) {
		const noNumCode = code.replace(/^\d+(?=[A-Za-z])/, '');
		const baseCode = noNumCode.split('-')[0];
		const webLinks = [];
		
		// 判断是否为无码或VR
		const isUncensored = item.Genres && item.Genres.includes('无码');
		const isVR = item.Genres && item.Genres.includes('VR');
		
		// 基础链接（所有影片都添加）
		webLinks.push({
			title: '搜索 javdb.com',
			url: `https://javdb.com/search?q=${noNumCode}&f=all`,
			color: 'pink',
			site: 'javdb'
		});
		
		webLinks.push({
			title: '搜索 javbus.com',
			url: `https://www.javbus.com/${code}`,
			color: 'red',
			site: 'javbus'
		});
		
		webLinks.push({
			title: '搜索 javlibrary.com',
			url: `https://www.javlibrary.com/cn/vl_searchbyid.php?keyword=${code}`,
			color: 'rgb(191, 96, 166)',
			site: 'javlibrary'
		});
		
		// 根据类型添加特定链接
		if (isUncensored) {
			// 无码影片
			webLinks.push({
				title: '搜索 7mmtv.sx',
				url: `https://7mmtv.sx/zh/searchform_search/all/index.html?search_keyword=${code}&search_type=searchall&op=search`,
				color: 'rgb(225, 125, 190)',
				site: '7mmtv'
			});
			
			webLinks.push({
				title: '搜索 missav.ws',
				url: `https://missav.ws/cn/search/${code}`,
				color: 'rgb(238, 152, 215)',
				site: 'missav'
			});
			
			// 根据番号格式添加特定站点
			if (/^n\d{4}$/i.test(code)) {
				webLinks.push({
					title: '搜索 tokyohot',
					url: `https://my.tokyo-hot.com/product/?q=${code.toLowerCase()}&x=0&y=0`,
					color: 'red',
					site: 'tokyohot'
				});
			} else if (/^\d+-\d+$/.test(code)) {
				webLinks.push({
					title: '搜索 caribbean',
					url: `https://www.caribbeancom.com/moviepages/${code.toLowerCase()}/index.html`,
					color: 'green',
					site: 'caribbean'
				});
			} else if (/^\d+_\d+$/.test(code)) {
				webLinks.push({
					title: '搜索 1pondo',
					url: `https://www.1pondo.tv/movies/${code.toLowerCase()}/`,
					color: 'rgb(230, 95, 167)',
					site: '1pondo'
				});
			} else if (code.toLowerCase().includes('heyzo')) {
				const heyzoNum = code.split('-')[1] || code.split('heyzo')[1];
				if (heyzoNum) {
					webLinks.push({
						title: '搜索 heyzo',
						url: `https://www.heyzo.com/moviepages/${heyzoNum}/index.html`,
						color: 'pink',
						site: 'heyzo'
					});
				}
			} else {
				webLinks.push({
					title: '搜索 ave',
					url: `https://www.aventertainments.com/search_Products.aspx?languageID=1&dept_id=29&keyword=${code}&searchby=keyword`,
					color: 'red',
					site: 'ave'
				});
			}
		} else if (isVR) {
			// VR影片
			const dmmCode = this.convertToDMMCode(noNumCode);
			webLinks.push({
				title: '搜索 dmm.co.jp',
				url: `https://www.dmm.co.jp/digital/videoa/-/list/search/=/device=vr/?searchstr=${dmmCode}`,
				color: 'red',
				site: 'dmm'
			});
			
			const jvrCode = (noNumCode.startsWith('DSVR') && /^\D+-\d{1,3}$/.test(code)) ? '3' + code : code;
			webLinks.push({
				title: '搜索 jvrlibrary.com',
				url: `https://jvrlibrary.com/jvr?id=${jvrCode}`,
				color: 'lightyellow',
				site: 'jvrlibrary'
			});
		} else {
			// 普通有码影片
			webLinks.push({
				title: '搜索 missav.ws',
				url: `https://missav.ws/cn/search/${code}`,
				color: 'rgb(238, 152, 215)',
				site: 'missav'
			});
			
			webLinks.push({
				title: '搜索 dmm.co.jp',
				url: `https://www.dmm.co.jp/mono/-/search/=/searchstr=${code.toLowerCase()}/`,
				color: 'red',
				site: 'dmm'
			});
			
			// 如果番号前有数字，可能是 MGS
			if (noNumCode !== code) {
				webLinks.push({
					title: '搜索 mgstage.com',
					url: `https://www.mgstage.com/search/cSearch.php?search_word=${code}&x=0&y=0&search_shop_id=&type=top`,
					color: 'red',
					site: 'prestige'
				});
			}
		}
		
		// 字幕网站
		webLinks.push({
			title: '搜索 subtitlecat.com',
			url: `https://www.subtitlecat.com/index.php?search=${noNumCode}`,
			color: 'rgb(255, 191, 54)',
			site: 'subtitlecat'
		});
		
		// 如果 baseCode 不包含数字，添加 javdb 番号页
		if (!/\d/.test(baseCode)) {
			webLinks.push({
				title: 'javdb 番号',
				url: `https://javdb.com/video_codes/${baseCode}`,
				color: '#ADD8E6',
				site: baseCode
			});
		}
		
		return webLinks;
	}
	
	// 辅助函数：转换为 DMM 格式的番号
	static convertToDMMCode(code) {
		code = code.toLowerCase();
		const regex = /-(\d+)/;
		const match = code.match(regex);
		
		if (match) {
			const digits = match[1];
			if (digits.length === 4) {
				return code.replace(regex, `0${digits}`);
			} else if (digits.length >= 1 && digits.length <= 3) {
				return code.replace(regex, `00${digits}`);
			}
		}
		
		return code;
	}
	
	// 插入网络链接到页面
	static insertWebLinks(titleElement, webLinks) {
		if (!webLinks || webLinks.length === 0) return;
		if (!this.enableWebLinks) return; // 如果未启用，直接返回
		
		// 在整个详情页范围内查找链接容器，避免重复创建
		const detailPage = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
		let linksContainer = detailPage ? detailPage.querySelector('.jv-web-links-container') : null;
		
		if (linksContainer) {
			// 如果容器已存在，检查内容是否已经正确
			const existingLinks = linksContainer.querySelectorAll('.jv-web-link');
			if (existingLinks.length === webLinks.length) {
				console.log('[ExtraFanart] 网络链接已存在且数量正确，跳过');
				return;
			}
			// 数量不对，清空重建
			console.log('[ExtraFanart] 网络链接数量不匹配，重建');
			linksContainer.innerHTML = '';
		} else {
			// 创建新容器
			console.log('[ExtraFanart] 创建新的网络链接容器');
			linksContainer = document.createElement('div');
			linksContainer.className = 'jv-web-links-container';
			
			// 找到合适的插入位置（标题元素的父元素之后）
			const titleParent = titleElement.parentElement;
			if (titleParent && titleParent.nextElementSibling) {
				titleParent.parentElement.insertBefore(linksContainer, titleParent.nextElementSibling);
			} else if (titleParent) {
				titleParent.parentElement.appendChild(linksContainer);
			} else {
				titleElement.insertAdjacentElement('afterend', linksContainer);
			}
		}
		
		// 创建链接元素
		webLinks.forEach((linkInfo) => {
			const link = document.createElement('a');
			link.href = linkInfo.url;
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
			link.className = 'jv-web-link';
			link.textContent = linkInfo.site.toUpperCase();
			link.title = linkInfo.title;
			link.style.color = linkInfo.color;
			link.style.borderColor = linkInfo.color;
			
			linksContainer.appendChild(link);
		});
		
		// 添加 JavDB 短评按钮（仅在启用时显示）
		if (this.enableJavdbReviews) {
			this.addJavdbReviewButton(linksContainer);
		}
	}
	
	// ===== JavDB 短评功能 =====
	
	// 简单的加密方法（Base64 + 字符偏移混淆）
	static encryptCredentials(username, password) {
		const data = JSON.stringify({ u: username, p: password, t: Date.now() });
		// 字符偏移混淆
		const shifted = data.split('').map((c, i) => 
			String.fromCharCode(c.charCodeAt(0) + (i % 7) + 3)
		).join('');
		// Base64 编码
		return btoa(encodeURIComponent(shifted));
	}
	
	// 解密方法
	static decryptCredentials(encrypted) {
		try {
			// Base64 解码
			const shifted = decodeURIComponent(atob(encrypted));
			// 字符偏移还原
			const data = shifted.split('').map((c, i) => 
				String.fromCharCode(c.charCodeAt(0) - (i % 7) - 3)
			).join('');
			const parsed = JSON.parse(data);
			return { username: parsed.u, password: parsed.p };
		} catch (error) {
			console.error('[ExtraFanart] 解密凭据失败:', error);
			return null;
		}
	}
	
	// 保存加密凭据
	static saveCredentials(username, password) {
		const encrypted = this.encryptCredentials(username, password);
		localStorage.setItem(this.JAVDB_CREDENTIALS_KEY, encrypted);
		console.log('[ExtraFanart] JavDB 凭据已加密保存');
	}
	
	// 获取已保存的凭据
	static getCredentials() {
		const encrypted = localStorage.getItem(this.JAVDB_CREDENTIALS_KEY);
		if (!encrypted) return null;
		return this.decryptCredentials(encrypted);
	}
	
	// 清除凭据
	static clearCredentials() {
		localStorage.removeItem(this.JAVDB_CREDENTIALS_KEY);
		localStorage.removeItem('javdb_token');
		localStorage.removeItem('javdb_token_expiry');
		this.javdbToken = null;
		this.javdbTokenExpiry = null;
		console.log('[ExtraFanart] JavDB 凭据已清除');
	}
	
	// 检查是否有已保存的凭据
	static hasCredentials() {
		return !!localStorage.getItem(this.JAVDB_CREDENTIALS_KEY);
	}
	
	// 显示凭据输入弹窗
	static showCredentialsModal(onSuccess) {
		// 如果弹窗已存在，先移除
		if (this.credentialsModal) {
			this.credentialsModal.remove();
		}
		
		const hasExisting = this.hasCredentials();
		
		const modal = document.createElement('div');
		modal.className = 'jv-reviews-modal';
		modal.innerHTML = `
			<div class="jv-reviews-backdrop"></div>
			<div class="jv-credentials-content">
				<div class="jv-credentials-header">
					<h3 class="jv-credentials-title">JavDB 账号登录</h3>
					<button class="jv-reviews-close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>
				<div class="jv-credentials-body">
					<p class="jv-credentials-desc">
						请输入你的 JavDB 账号和密码以获取短评功能。<br>
						<small>凭据将加密存储在本地浏览器中，不会上传到任何服务器。</small>
					</p>
					<div class="jv-credentials-form">
						<div class="jv-form-group">
							<label>用户名/邮箱</label>
							<input type="text" id="jv-username" placeholder="请输入用户名或邮箱" autocomplete="username">
						</div>
						<div class="jv-form-group">
							<label>密码</label>
							<input type="password" id="jv-password" placeholder="请输入密码" autocomplete="current-password">
						</div>
					</div>
					<div class="jv-credentials-error" style="display:none;"></div>
				</div>
				<div class="jv-credentials-footer">
					${hasExisting ? '<button class="jv-btn jv-btn-danger jv-clear-btn">清除已保存的账号</button>' : ''}
					<div class="jv-credentials-actions">
						<button class="jv-btn jv-btn-secondary jv-cancel-btn">取消</button>
						<button class="jv-btn jv-btn-primary jv-login-btn">登录并保存</button>
					</div>
				</div>
			</div>
		`;
		
		document.body.appendChild(modal);
		this.credentialsModal = modal;
		
		// 获取元素
		const closeBtn = modal.querySelector('.jv-reviews-close');
		const backdrop = modal.querySelector('.jv-reviews-backdrop');
		const cancelBtn = modal.querySelector('.jv-cancel-btn');
		const loginBtn = modal.querySelector('.jv-login-btn');
		const clearBtn = modal.querySelector('.jv-clear-btn');
		const usernameInput = modal.querySelector('#jv-username');
		const passwordInput = modal.querySelector('#jv-password');
		const errorDiv = modal.querySelector('.jv-credentials-error');
		
		const closeModal = () => {
			modal.classList.add('closing');
			setTimeout(() => {
				modal.remove();
				this.credentialsModal = null;
			}, 200);
		};
		
		const showError = (msg) => {
			errorDiv.textContent = msg;
			errorDiv.style.display = 'block';
		};
		
		closeBtn.onclick = closeModal;
		backdrop.onclick = closeModal;
		cancelBtn.onclick = closeModal;
		
		// 清除按钮
		if (clearBtn) {
			clearBtn.onclick = () => {
				if (confirm('确定要清除已保存的 JavDB 账号吗？')) {
					this.clearCredentials();
					this.showToast('账号已清除');
					closeModal();
				}
			};
		}
		
		// 登录按钮
		loginBtn.onclick = async () => {
			const username = usernameInput.value.trim();
			const password = passwordInput.value;
			
			if (!username || !password) {
				showError('请输入用户名和密码');
				return;
			}
			
			loginBtn.textContent = '验证中...';
			loginBtn.disabled = true;
			errorDiv.style.display = 'none';
			
			try {
				// 尝试登录验证
				const token = await this.javdbLoginWithCredentials(username, password);
				if (token) {
					// 登录成功，保存凭据
					this.saveCredentials(username, password);
					this.showToast('登录成功');
					closeModal();
					// 回调成功
					if (onSuccess) onSuccess();
				} else {
					showError('登录失败，请检查用户名和密码');
				}
			} catch (error) {
				showError('登录失败: ' + (error.message || '网络错误'));
			} finally {
				loginBtn.textContent = '登录并保存';
				loginBtn.disabled = false;
			}
		};
		
		// 回车提交
		passwordInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				loginBtn.click();
			}
		});
		
		// 按 ESC 关闭
		const escHandler = (e) => {
			if (e.key === 'Escape') {
				closeModal();
				document.removeEventListener('keydown', escHandler);
			}
		};
		document.addEventListener('keydown', escHandler);
		
		// 显示动画并聚焦输入框
		requestAnimationFrame(() => {
			modal.classList.add('visible');
			usernameInput.focus();
		});
	}
	
	// 使用指定凭据登录（用于验证）
	static async javdbLoginWithCredentials(username, password) {
		try {
			const url = 'https://jdforrepam.com/api/v1/sessions';
			const params = new URLSearchParams({
				username: username,
				password: password,
				device_uuid: '04b9534d-5118-53de-9f87-2ddded77111e',
				device_name: 'Chrome',
				device_model: 'Browser',
				platform: 'web',
				system_version: '1.0',
				app_version: 'official',
				app_version_number: '1.9.29',
				app_channel: 'official'
			});
			
			const response = await fetch(`${url}?${params.toString()}`, {
				method: 'POST',
				headers: {
					'User-Agent': 'Dart/3.5 (dart:io)',
					'Accept-Language': 'zh-TW',
					'jdSignature': this.generateJavdbSignature()
				}
			});
			
			if (!response.ok) {
				return null;
			}
			
			const data = await response.json();
			if (data.data && data.data.token) {
				this.javdbToken = data.data.token;
				const expiry = new Date();
				expiry.setDate(expiry.getDate() + 30);
				this.javdbTokenExpiry = expiry.toISOString();
				
				localStorage.setItem('javdb_token', this.javdbToken);
				localStorage.setItem('javdb_token_expiry', this.javdbTokenExpiry);
				
				return this.javdbToken;
			}
			
			return null;
		} catch (error) {
			console.error('[ExtraFanart] JavDB 登录失败:', error);
			return null;
		}
	}
	
	// 加载 JavDB 缓存
	static loadJavdbCache() {
		try {
			const cacheStr = localStorage.getItem(this.JAVDB_CACHE_KEY);
			if (!cacheStr) {
				return { movies: {}, reviews: {} };
			}
			const cache = JSON.parse(cacheStr);
			// 清理过期数据
			this.cleanExpiredCache(cache);
			console.log('[ExtraFanart] JavDB 缓存已加载，影片:', Object.keys(cache.movies || {}).length, '短评:', Object.keys(cache.reviews || {}).length);
			return cache;
		} catch (error) {
			console.error('[ExtraFanart] 加载 JavDB 缓存失败:', error);
			return { movies: {}, reviews: {} };
		}
	}
	
	// 保存 JavDB 缓存
	static saveJavdbCache() {
		try {
			// 检查并清理缓存大小
			this.ensureCacheSize();
			const cacheStr = JSON.stringify(this.javdbCache);
			localStorage.setItem(this.JAVDB_CACHE_KEY, cacheStr);
			console.log('[ExtraFanart] JavDB 缓存已保存，大小:', (cacheStr.length / 1024).toFixed(2), 'KB');
		} catch (error) {
			if (error.name === 'QuotaExceededError') {
				console.warn('[ExtraFanart] localStorage 空间不足，清理旧缓存');
				this.clearOldestCache(10);
				try {
					localStorage.setItem(this.JAVDB_CACHE_KEY, JSON.stringify(this.javdbCache));
				} catch (e) {
					console.error('[ExtraFanart] 清理后仍无法保存缓存');
				}
			} else {
				console.error('[ExtraFanart] 保存 JavDB 缓存失败:', error);
			}
		}
	}
	
	// 清理过期缓存
	static cleanExpiredCache(cache) {
		const now = Date.now();
		const expiryMs = this.JAVDB_CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
		let cleaned = 0;
		
		// 清理过期的影片搜索结果
		if (cache.movies) {
			for (const key of Object.keys(cache.movies)) {
				if (now - cache.movies[key].timestamp > expiryMs) {
					delete cache.movies[key];
					cleaned++;
				}
			}
		}
		
		// 清理过期的短评
		if (cache.reviews) {
			for (const key of Object.keys(cache.reviews)) {
				if (now - cache.reviews[key].timestamp > expiryMs) {
					delete cache.reviews[key];
					cleaned++;
				}
			}
		}
		
		if (cleaned > 0) {
			console.log('[ExtraFanart] 清理过期缓存:', cleaned, '条');
		}
	}
	
	// 确保缓存大小不超限
	static ensureCacheSize() {
		const cacheStr = JSON.stringify(this.javdbCache);
		const currentSize = cacheStr.length;
		
		// 如果超过最大大小，清理旧数据
		if (currentSize > this.JAVDB_CACHE_MAX_SIZE) {
			console.log('[ExtraFanart] 缓存超限，当前:', (currentSize / 1024).toFixed(2), 'KB，开始清理');
			this.clearOldestCache(10);
		}
		
		// 如果条目数超限，清理旧数据
		const movieCount = Object.keys(this.javdbCache.movies || {}).length;
		const reviewCount = Object.keys(this.javdbCache.reviews || {}).length;
		if (movieCount + reviewCount > this.JAVDB_CACHE_MAX_ITEMS) {
			console.log('[ExtraFanart] 缓存条目超限，开始清理');
			this.clearOldestCache(10);
		}
	}
	
	// 清理最旧的缓存
	static clearOldestCache(count) {
		// 收集所有缓存项及其时间戳
		const items = [];
		
		if (this.javdbCache.movies) {
			for (const [key, value] of Object.entries(this.javdbCache.movies)) {
				items.push({ type: 'movies', key, timestamp: value.timestamp });
			}
		}
		
		if (this.javdbCache.reviews) {
			for (const [key, value] of Object.entries(this.javdbCache.reviews)) {
				items.push({ type: 'reviews', key, timestamp: value.timestamp });
			}
		}
		
		// 按时间戳排序，删除最旧的
		items.sort((a, b) => a.timestamp - b.timestamp);
		const toDelete = items.slice(0, count);
		
		for (const item of toDelete) {
			delete this.javdbCache[item.type][item.key];
		}
		
		console.log('[ExtraFanart] 清理了', toDelete.length, '条旧缓存');
	}
	
	// 缓存影片搜索结果
	static cacheMovieSearch(code, movieInfo) {
		if (!this.javdbCache.movies) {
			this.javdbCache.movies = {};
		}
		this.javdbCache.movies[code.toUpperCase()] = {
			data: movieInfo,
			timestamp: Date.now()
		};
		this.saveJavdbCache();
	}
	
	// 获取缓存的影片搜索结果
	static getCachedMovieSearch(code) {
		if (!this.javdbCache.movies) return null;
		const cached = this.javdbCache.movies[code.toUpperCase()];
		if (!cached) return null;
		
		// 检查是否过期
		const expiryMs = this.JAVDB_CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
		if (Date.now() - cached.timestamp > expiryMs) {
			delete this.javdbCache.movies[code.toUpperCase()];
			return null;
		}
		
		return cached.data;
	}
	
	// 缓存短评
	static cacheReviews(movieId, page, sortBy, reviewsData) {
		if (!this.javdbCache.reviews) {
			this.javdbCache.reviews = {};
		}
		const cacheKey = `${movieId}_${page}_${sortBy}`;
		this.javdbCache.reviews[cacheKey] = {
			data: reviewsData,
			timestamp: Date.now()
		};
		this.saveJavdbCache();
	}
	
	// 获取缓存的短评
	static getCachedReviews(movieId, page, sortBy) {
		if (!this.javdbCache.reviews) return null;
		const cacheKey = `${movieId}_${page}_${sortBy}`;
		const cached = this.javdbCache.reviews[cacheKey];
		if (!cached) return null;
		
		// 检查是否过期
		const expiryMs = this.JAVDB_CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
		if (Date.now() - cached.timestamp > expiryMs) {
			delete this.javdbCache.reviews[cacheKey];
			return null;
		}
		
		return cached.data;
	}
	
	// 生成 JavDB API 签名
	static generateJavdbSignature() {
		const timestamp = Math.floor(Date.now() / 1000);
		const secretKey = '71cf27bb3c0bcdf207b64abecddc970098c7421ee7203b9cdae54478478a199e7d5a6e1a57691123c1a931c057842fb73ba3b3c83bcd69c17ccf174081e3d8aa';
		const signBase = `${timestamp}${secretKey}`;
		
		// 使用 Web Crypto API 或简单的 MD5 实现
		const signHash = this.md5(signBase);
		return `${timestamp}.lpw6vgqzsp.${signHash}`;
	}
	
	// 简单的 MD5 实现
	static md5(string) {
		function md5cycle(x, k) {
			var a = x[0], b = x[1], c = x[2], d = x[3];
			a = ff(a, b, c, d, k[0], 7, -680876936);
			d = ff(d, a, b, c, k[1], 12, -389564586);
			c = ff(c, d, a, b, k[2], 17, 606105819);
			b = ff(b, c, d, a, k[3], 22, -1044525330);
			a = ff(a, b, c, d, k[4], 7, -176418897);
			d = ff(d, a, b, c, k[5], 12, 1200080426);
			c = ff(c, d, a, b, k[6], 17, -1473231341);
			b = ff(b, c, d, a, k[7], 22, -45705983);
			a = ff(a, b, c, d, k[8], 7, 1770035416);
			d = ff(d, a, b, c, k[9], 12, -1958414417);
			c = ff(c, d, a, b, k[10], 17, -42063);
			b = ff(b, c, d, a, k[11], 22, -1990404162);
			a = ff(a, b, c, d, k[12], 7, 1804603682);
			d = ff(d, a, b, c, k[13], 12, -40341101);
			c = ff(c, d, a, b, k[14], 17, -1502002290);
			b = ff(b, c, d, a, k[15], 22, 1236535329);
			a = gg(a, b, c, d, k[1], 5, -165796510);
			d = gg(d, a, b, c, k[6], 9, -1069501632);
			c = gg(c, d, a, b, k[11], 14, 643717713);
			b = gg(b, c, d, a, k[0], 20, -373897302);
			a = gg(a, b, c, d, k[5], 5, -701558691);
			d = gg(d, a, b, c, k[10], 9, 38016083);
			c = gg(c, d, a, b, k[15], 14, -660478335);
			b = gg(b, c, d, a, k[4], 20, -405537848);
			a = gg(a, b, c, d, k[9], 5, 568446438);
			d = gg(d, a, b, c, k[14], 9, -1019803690);
			c = gg(c, d, a, b, k[3], 14, -187363961);
			b = gg(b, c, d, a, k[8], 20, 1163531501);
			a = gg(a, b, c, d, k[13], 5, -1444681467);
			d = gg(d, a, b, c, k[2], 9, -51403784);
			c = gg(c, d, a, b, k[7], 14, 1735328473);
			b = gg(b, c, d, a, k[12], 20, -1926607734);
			a = hh(a, b, c, d, k[5], 4, -378558);
			d = hh(d, a, b, c, k[8], 11, -2022574463);
			c = hh(c, d, a, b, k[11], 16, 1839030562);
			b = hh(b, c, d, a, k[14], 23, -35309556);
			a = hh(a, b, c, d, k[1], 4, -1530992060);
			d = hh(d, a, b, c, k[4], 11, 1272893353);
			c = hh(c, d, a, b, k[7], 16, -155497632);
			b = hh(b, c, d, a, k[10], 23, -1094730640);
			a = hh(a, b, c, d, k[13], 4, 681279174);
			d = hh(d, a, b, c, k[0], 11, -358537222);
			c = hh(c, d, a, b, k[3], 16, -722521979);
			b = hh(b, c, d, a, k[6], 23, 76029189);
			a = hh(a, b, c, d, k[9], 4, -640364487);
			d = hh(d, a, b, c, k[12], 11, -421815835);
			c = hh(c, d, a, b, k[15], 16, 530742520);
			b = hh(b, c, d, a, k[2], 23, -995338651);
			a = ii(a, b, c, d, k[0], 6, -198630844);
			d = ii(d, a, b, c, k[7], 10, 1126891415);
			c = ii(c, d, a, b, k[14], 15, -1416354905);
			b = ii(b, c, d, a, k[5], 21, -57434055);
			a = ii(a, b, c, d, k[12], 6, 1700485571);
			d = ii(d, a, b, c, k[3], 10, -1894986606);
			c = ii(c, d, a, b, k[10], 15, -1051523);
			b = ii(b, c, d, a, k[1], 21, -2054922799);
			a = ii(a, b, c, d, k[8], 6, 1873313359);
			d = ii(d, a, b, c, k[15], 10, -30611744);
			c = ii(c, d, a, b, k[6], 15, -1560198380);
			b = ii(b, c, d, a, k[13], 21, 1309151649);
			a = ii(a, b, c, d, k[4], 6, -145523070);
			d = ii(d, a, b, c, k[11], 10, -1120210379);
			c = ii(c, d, a, b, k[2], 15, 718787259);
			b = ii(b, c, d, a, k[9], 21, -343485551);
			x[0] = add32(a, x[0]);
			x[1] = add32(b, x[1]);
			x[2] = add32(c, x[2]);
			x[3] = add32(d, x[3]);
		}
		function cmn(q, a, b, x, s, t) {
			a = add32(add32(a, q), add32(x, t));
			return add32((a << s) | (a >>> (32 - s)), b);
		}
		function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
		function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
		function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
		function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
		function md5blk(s) {
			var md5blks = [], i;
			for (i = 0; i < 64; i += 4) {
				md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
			}
			return md5blks;
		}
		function md5blk_array(a) {
			var md5blks = [], i;
			for (i = 0; i < 64; i += 4) {
				md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
			}
			return md5blks;
		}
		function md51(s) {
			var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
			for (i = 64; i <= n; i += 64) {
				md5cycle(state, md5blk(s.substring(i - 64, i)));
			}
			s = s.substring(i - 64);
			length = s.length;
			tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
			for (i = 0; i < length; i++) {
				tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
			}
			tail[i >> 2] |= 0x80 << ((i % 4) << 3);
			if (i > 55) {
				md5cycle(state, tail);
				for (i = 0; i < 16; i++) tail[i] = 0;
			}
			tmp = n * 8;
			tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
			lo = parseInt(tmp[2], 16);
			hi = parseInt(tmp[1], 16) || 0;
			tail[14] = lo;
			tail[15] = hi;
			md5cycle(state, tail);
			return state;
		}
		function md5_vm_test() { return hex(md51('abc')) === '900150983cd24fb0d6963f7d28e17f72'; }
		function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
		function hex(x) {
			var hex_chr = '0123456789abcdef'.split('');
			for (var i = 0; i < x.length; i++) {
				x[i] = rhex(x[i]);
			}
			return x.join('');
		}
		function rhex(n) {
			var hex_chr = '0123456789abcdef'.split('');
			var s = '', j;
			for (j = 0; j < 4; j++) {
				s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
			}
			return s;
		}
		return hex(md51(string));
	}
	
	// JavDB 登录获取 Token（使用已保存的凭据）
	static async javdbLogin() {
		// 检查 token 是否有效
		if (this.javdbToken && this.javdbTokenExpiry) {
			const expiry = new Date(this.javdbTokenExpiry);
			if (expiry > new Date()) {
				console.log('[ExtraFanart] 使用缓存的 JavDB Token');
				return this.javdbToken;
			}
		}
		
		// 获取已保存的凭据
		const credentials = this.getCredentials();
		if (!credentials) {
			console.log('[ExtraFanart] 没有保存的 JavDB 凭据');
			return null;
		}
		
		// 使用凭据登录
		return await this.javdbLoginWithCredentials(credentials.username, credentials.password);
	}
	
	// 搜索 JavDB 影片获取 movie_id（带缓存）
	static async searchJavdbMovie(code) {
		// 先检查缓存
		const cached = this.getCachedMovieSearch(code);
		if (cached) {
			console.log('[ExtraFanart] 使用缓存的影片搜索结果:', code);
			return cached;
		}
		
		try {
			const url = 'https://jdforrepam.com/api/v2/search';
			const params = new URLSearchParams({
				q: code,
				page: 1,
				type: 'movie',
				limit: 1,
				movie_type: 'all',
				from_recent: 'false',
				movie_filter_by: 'all',
				movie_sort_by: 'relevance'
			});
			
			const response = await fetch(`${url}?${params.toString()}`, {
				method: 'GET',
				headers: {
					'User-Agent': 'Dart/3.5 (dart:io)',
					'Accept-Language': 'zh-TW',
					'Host': 'jdforrepam.com',
					'jdSignature': this.generateJavdbSignature()
				}
			});
			
			if (!response.ok) {
				throw new Error(`搜索失败: ${response.status}`);
			}
			
			const data = await response.json();
			if (data.data && data.data.movies && data.data.movies.length > 0) {
				const movie = data.data.movies[0];
				console.log('[ExtraFanart] 找到 JavDB 影片:', movie.number, 'ID:', movie.id);
				const movieInfo = {
					movieId: movie.id,
					number: movie.number,
					title: movie.title,
					score: movie.score,
					reviewsCount: movie.watched_count
				};
				// 缓存结果
				this.cacheMovieSearch(code, movieInfo);
				return movieInfo;
			}
			
			return null;
		} catch (error) {
			console.error('[ExtraFanart] JavDB 搜索失败:', error);
			return null;
		}
	}
	
	// 获取 JavDB 影片详情（包含评分）
	static async getJavdbMovieDetail(movieId) {
		try {
			const url = `https://jdforrepam.com/api/v4/movies/${movieId}`;
			
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'User-Agent': 'Dart/3.5 (dart:io)',
					'Accept-Language': 'zh-TW',
					'Host': 'jdforrepam.com',
					'jdSignature': this.generateJavdbSignature()
				}
			});
			
			if (!response.ok) {
				throw new Error(`获取详情失败: ${response.status}`);
			}
			
			const data = await response.json();
			if (data.data && data.data.movie) {
				const movie = data.data.movie;
				return {
					movieId: movie.id,
					number: movie.number,
					title: movie.origin_title || movie.title,
					score: movie.score,
					reviewsCount: movie.watched_count,
					commentsCount: movie.comments_count
				};
			}
			
			return null;
		} catch (error) {
			console.error('[ExtraFanart] 获取 JavDB 影片详情失败:', error);
			return null;
		}
	}
	
	// 获取 JavDB 影片短评（带缓存）
	static async getJavdbReviews(movieId, page = 1, sortBy = 'hotly') {
		// 先检查缓存
		const cached = this.getCachedReviews(movieId, page, sortBy);
		if (cached) {
			console.log('[ExtraFanart] 使用缓存的短评数据:', movieId, 'page:', page, 'sort:', sortBy);
			return cached;
		}
		
		try {
			const url = `https://jdforrepam.com/api/v1/movies/${movieId}/reviews`;
			const params = new URLSearchParams({
				page: page,
				sort_by: sortBy,
				limit: 20
			});
			
			const headers = {
				'User-Agent': 'Dart/3.5 (dart:io)',
				'Accept-Language': 'zh-TW',
				'Host': 'jdforrepam.com',
				'jdSignature': this.generateJavdbSignature()
			};
			
			// 如果有 token，添加授权头
			if (this.javdbToken) {
				headers['Authorization'] = `Bearer ${this.javdbToken}`;
			}
			
			const response = await fetch(`${url}?${params.toString()}`, {
				method: 'GET',
				headers: headers
			});
			
			if (!response.ok) {
				throw new Error(`获取短评失败: ${response.status}`);
			}
			
			const data = await response.json();
			const reviewsData = data.data;
			
			// 缓存结果
			if (reviewsData) {
				this.cacheReviews(movieId, page, sortBy, reviewsData);
			}
			
			return reviewsData;
		} catch (error) {
			console.error('[ExtraFanart] 获取 JavDB 短评失败:', error);
			return null;
		}
	}
	
	// 添加 JavDB 短评按钮
	static addJavdbReviewButton(container) {
		// 检查是否已经存在按钮
		if (container.querySelector('.jv-javdb-review-btn')) {
			return;
		}
		
		// 创建按钮容器
		const buttonWrapper = document.createElement('div');
		buttonWrapper.className = 'jv-javdb-btn-wrapper';
		buttonWrapper.style.display = 'inline-flex';
		buttonWrapper.style.alignItems = 'center';
		buttonWrapper.style.gap = '4px';
		
		const button = document.createElement('button');
		button.className = 'jv-web-link jv-javdb-review-btn';
		button.textContent = '短评';
		button.title = '获取 JavDB 短评';
		button.style.color = '#00a4dc';
		button.style.borderColor = '#00a4dc';
		button.style.cursor = 'pointer';
		button.style.background = 'transparent';
		
		button.onclick = async (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			// 获取当前番号
			const cachedCodeInfo = this.cachedCodes.get(this.itemId);
			if (!cachedCodeInfo || !cachedCodeInfo.code) {
				this.showToast('无法获取番号');
				return;
			}
			
			const code = cachedCodeInfo.code;
			
		// 检查是否有已保存的凭据
		if (!this.hasCredentials()) {
			// 没有凭据，显示输入弹窗
			this.showCredentialsModal(() => {
				// 登录成功后更新齿轮按钮状态
				if (settingsBtn.updateState) {
					settingsBtn.updateState();
				}
				// 自动获取短评
				button.click();
			});
			return;
		}			console.log('[ExtraFanart] 获取短评，番号:', code);
			
			// 显示加载中
			button.textContent = '加载中...';
			button.disabled = true;
			
			try {
			// 先登录获取 token
			const token = await this.javdbLogin();
			if (!token) {
				// Token 获取失败，可能凭据过期，提示重新输入
				this.showCredentialsModal(() => {
					// 登录成功后更新齿轮按钮状态
					if (settingsBtn.updateState) {
						settingsBtn.updateState();
					}
					button.click();
				});
				return;
			}				
                
                // 搜索影片获取 movie_id
				let movieInfo = await this.searchJavdbMovie(code);

                // ============================================================
                // [新增逻辑开始]：针对 123abc-123 格式的重试机制
                // ============================================================
                if (!movieInfo) {
                    // 正则检查：以数字开头，紧接着是字母 (不区分大小写)
                    // 例如匹配 123abc-123 中的 123
                    if (/^\d+[a-z]/i.test(code)) {
                        // 去除开头的数字
                        const retryCode = code.replace(/^\d+(?=[a-z])/i, '');
                        console.log(`[ExtraFanart] 原番号 ${code} 未找到，尝试优化番号搜索: ${retryCode}`);
                        movieInfo = await this.searchJavdbMovie(retryCode);
                    }
                }
                // ============================================================
                // [新增逻辑结束]
                // ============================================================
				
				if (!movieInfo) {
					this.showToast('未找到该影片');
					return;
				}
				
				// 如果没有评分，获取详情补充评分
				if (!movieInfo.score) {
					const detail = await this.getJavdbMovieDetail(movieInfo.movieId);
					if (detail) {
						movieInfo.score = detail.score;
						movieInfo.commentsCount = detail.commentsCount;
						// 更新缓存（注意：这里使用最后成功的代码进行缓存更新可能有歧义，但保持原逻辑即可）
                        // 如果是重试成功的，建议用原始code还是retryCode缓存取决于你希望下次是否还走重试
						this.cacheMovieSearch(code, movieInfo); 
					}
				}
				
				// 获取短评（获取更多条以便排序）
				const reviewsData = await this.getJavdbReviews(movieInfo.movieId, 1, 'hotly');
				if (!reviewsData || !reviewsData.reviews || reviewsData.reviews.length === 0) {
					this.showToast('暂无短评');
					return;
				}
				
				// 显示短评弹窗
				this.showReviewsModal(movieInfo, reviewsData);
				
		} catch (error) {
			console.error('[ExtraFanart] 获取短评失败:', error);
			this.showToast('获取短评失败');
		} finally {
			button.textContent = '短评';
			button.disabled = false;
		}
	};
	
	// 创建齿轮设置按钮
	const settingsBtn = document.createElement('button');
	settingsBtn.className = 'jv-javdb-settings-btn';
	settingsBtn.title = '清除 JavDB 凭据';
	settingsBtn.innerHTML = `
		<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="3"></circle>
			<path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
		</svg>
	`;
	
	// 更新按钮状态的函数
	const updateSettingsBtnState = () => {
		const hasCredentials = this.hasCredentials();
		settingsBtn.style.opacity = hasCredentials ? '1' : '0.3';
		settingsBtn.style.pointerEvents = hasCredentials ? 'auto' : 'none';
	};
	
	settingsBtn.style.cssText = `
		background: transparent;
		border: 1px solid rgba(0, 164, 220, 0.5);
		border-radius: 4px;
		padding: 4px;
		cursor: pointer;
		color: rgba(0, 164, 220, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		opacity: ${this.hasCredentials() ? '1' : '0.3'};
		pointer-events: ${this.hasCredentials() ? 'auto' : 'none'};
	`;
	
	// 将更新函数存储在按钮上,以便外部调用
	settingsBtn.updateState = updateSettingsBtnState;
	
	settingsBtn.onmouseenter = () => {
		if (this.hasCredentials()) {
			settingsBtn.style.color = '#00a4dc';
			settingsBtn.style.borderColor = '#00a4dc';
			settingsBtn.style.background = 'rgba(0, 164, 220, 0.1)';
		}
	};
	
	settingsBtn.onmouseleave = () => {
		settingsBtn.style.color = 'rgba(0, 164, 220, 0.7)';
		settingsBtn.style.borderColor = 'rgba(0, 164, 220, 0.5)';
		settingsBtn.style.background = 'transparent';
	};
	
	settingsBtn.onclick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		
		if (!this.hasCredentials()) {
			return;
		}
		
		if (confirm('确定要清除已保存的 JavDB 账号吗?清除后下次使用时需要重新输入。')) {
			this.clearCredentials();
			this.showToast('JavDB 账号已清除');
			// 更新按钮状态
			settingsBtn.style.opacity = '0.3';
			settingsBtn.style.pointerEvents = 'none';
		}
	};
	
	buttonWrapper.appendChild(button);
	buttonWrapper.appendChild(settingsBtn);
	container.appendChild(buttonWrapper);
}	// 创建并显示短评弹窗
	static showReviewsModal(movieInfo, reviewsData) {
		// 如果弹窗已存在，先移除
		if (this.reviewsModal) {
			this.reviewsModal.remove();
		}
		
		// 按点赞数排序短评
		const sortedReviews = [...reviewsData.reviews].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
		
		const modal = document.createElement('div');
		modal.className = 'jv-reviews-modal';
		modal.innerHTML = `
			<div class="jv-reviews-backdrop"></div>
			<div class="jv-reviews-content">
				<div class="jv-reviews-header">
					<div class="jv-reviews-title-wrapper">
						<h3 class="jv-reviews-title">JavDB 短评</h3>
						<span class="jv-reviews-subtitle">${movieInfo.number} · 评分 ${movieInfo.score || '暂无'} · ${reviewsData.pagination?.total || reviewsData.reviews.length} 条短评</span>
					</div>
					<button class="jv-reviews-close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>
				<div class="jv-reviews-sort-hint">
					<span>按点赞数排序</span>
				</div>
				<div class="jv-reviews-list">
					${this.renderReviews(sortedReviews)}
				</div>
				<div class="jv-reviews-pagination">
					<span class="jv-reviews-page-info">第 1 页</span>
					${reviewsData.pagination && reviewsData.pagination.total_pages > 1 ? `
						<div class="jv-reviews-page-btns">
							<button class="jv-page-btn jv-prev-page" disabled>上一页</button>
							<button class="jv-page-btn jv-next-page">下一页</button>
						</div>
					` : ''}
				</div>
			</div>
		`;
		
		document.body.appendChild(modal);
		this.reviewsModal = modal;
		
		// 当前状态
		let currentPage = 1;
		const totalPages = reviewsData.pagination?.total_pages || 1;
		
		// 绑定事件
		const closeBtn = modal.querySelector('.jv-reviews-close');
		const backdrop = modal.querySelector('.jv-reviews-backdrop');
		const prevBtn = modal.querySelector('.jv-prev-page');
		const nextBtn = modal.querySelector('.jv-next-page');
		const pageInfo = modal.querySelector('.jv-reviews-page-info');
		const reviewsList = modal.querySelector('.jv-reviews-list');
		
		const closeModal = () => {
			modal.classList.add('closing');
			setTimeout(() => {
				modal.remove();
				this.reviewsModal = null;
			}, 200);
		};
		
		closeBtn.onclick = closeModal;
		backdrop.onclick = closeModal;
		
		// 按 ESC 关闭
		const escHandler = (e) => {
			if (e.key === 'Escape') {
				closeModal();
				document.removeEventListener('keydown', escHandler);
			}
		};
		document.addEventListener('keydown', escHandler);
		
		// 分页
		const loadPage = async (page) => {
			if (page < 1 || page > totalPages) return;
			
			currentPage = page;
			reviewsList.innerHTML = '<div class="jv-reviews-loading">加载中...</div>';
			
			const newData = await this.getJavdbReviews(movieInfo.movieId, currentPage, 'hotly');
			if (newData && newData.reviews) {
				// 按点赞数排序
				const sorted = [...newData.reviews].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
				reviewsList.innerHTML = this.renderReviews(sorted);
				this.updatePagination(pageInfo, prevBtn, nextBtn, currentPage, newData.pagination?.total_pages || 1);
				// 滚动到顶部
				reviewsList.scrollTop = 0;
			}
		};
		
		if (prevBtn) {
			prevBtn.onclick = () => loadPage(currentPage - 1);
		}
		if (nextBtn) {
			nextBtn.onclick = () => loadPage(currentPage + 1);
		}
		
		// 显示动画
		requestAnimationFrame(() => {
			modal.classList.add('visible');
		});
	}
	
	// 渲染短评列表
	static renderReviews(reviews) {
		if (!reviews || reviews.length === 0) {
			return '<div class="jv-reviews-empty">暂无短评</div>';
		}
		
		return reviews.map(review => {
			// 1. 改进的用户信息提取逻辑
			const user = review.user || {};
			
			// 尝试从多个可能的字段获取用户名
			const username = user.username || 
							 user.name || 
							 review.user_name || 
							 review.username || 
							 '匿名用户';

			// 尝试获取头像，增加默认占位图逻辑
			const avatar = user.avatar_url || 
						   review.user_avatar || 
						   'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNjY2Ij48cGF0aCBkPSJNMTIgMTJjMi4yMSAwIDQtMS43OSA0LTRzLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+PC9zdmc+';
			
			const score = review.score ? `${review.score}分` : '';
			const content = review.content || '';
			const likes = review.likes_count || 0;
			const createdAt = this.formatReviewDate(review.created_at);
			
			// 用户标签（增加对 contributor 字段的容错）
			const tags = [];
			if (user.is_vip || review.is_vip) tags.push('<span class="jv-review-tag vip">VIP</span>');
			if (user.is_contributor || review.is_contributor) tags.push('<span class="jv-review-tag contributor">贡献者</span>');
			
			return `
				<div class="jv-review-item">
					<div class="jv-review-header">
						<img class="jv-review-avatar" src="${avatar}" alt="${username}" onerror="this.src='data:image/svg+xml;base64,...'"/>
						<div class="jv-review-user-info">
							<div class="jv-review-username">
								${this.escapeHtml(username)}
								${tags.join('')}
							</div>
							<div class="jv-review-meta">
								${score ? `<span class="jv-review-score">${score}</span>` : ''}
								<span class="jv-review-date">${createdAt}</span>
							</div>
						</div>
					</div>
					<div class="jv-review-content">${this.escapeHtml(content)}</div>
					<div class="jv-review-footer">
						<span class="jv-review-likes">
							<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
								<path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
							</svg>
							${likes}
						</span>
					</div>
				</div>
			`;
		}).join('');
	}
	
	// 格式化日期
	static formatReviewDate(dateStr) {
		if (!dateStr) return '';
		try {
			const date = new Date(dateStr);
			const now = new Date();
			const diff = now - date;
			
			const minutes = Math.floor(diff / 60000);
			const hours = Math.floor(diff / 3600000);
			const days = Math.floor(diff / 86400000);
			
			if (minutes < 1) return '刚刚';
			if (minutes < 60) return `${minutes}分钟前`;
			if (hours < 24) return `${hours}小时前`;
			if (days < 30) return `${days}天前`;
			
			return date.toLocaleDateString('zh-CN');
		} catch {
			return dateStr;
		}
	}
	
	// HTML 转义
	static escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
	
	// 更新分页状态
	static updatePagination(pageInfo, prevBtn, nextBtn, currentPage, totalPages) {
		if (pageInfo) {
			pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页`;
		}
		if (prevBtn) {
			prevBtn.disabled = currentPage <= 1;
		}
		if (nextBtn) {
			nextBtn.disabled = currentPage >= totalPages;
		}
	}

	static async copyToClipboard(text) {
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				// 降级方案
				const textarea = document.createElement('textarea');
				textarea.value = text;
				textarea.style.position = 'absolute';
				textarea.style.left = '-9999px';
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand('copy');
				document.body.removeChild(textarea);
			}
		} catch (err) {
			console.error('[ExtraFanart] 复制失败:', err);
		}
	}

	static showToast(message) {
		// 检查是否有 Emby 的 toast 模块
		if (typeof Emby !== 'undefined' && Emby.importModule) {
			Emby.importModule('./modules/toast/toast.js').then(toast => {
				toast({
					text: message,
					icon: "\uf0c5"
				});
			});
		} else {
			// 降级方案：使用简单的提示
			const toast = document.createElement('div');
			toast.textContent = message;
			toast.style.cssText = `
				position: fixed;
				top: 20px;
				left: 50%;
				transform: translateX(-50%);
				background: rgba(0, 0, 0, 0.8);
				color: white;
				padding: 12px 24px;
				border-radius: 8px;
				z-index: 10000;
				font-size: 14px;
			`;
			document.body.appendChild(toast);
			setTimeout(() => {
				toast.style.opacity = '0';
				toast.style.transition = 'opacity 0.3s';
				setTimeout(() => toast.remove(), 300);
			}, 2000);
		}
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
				margin: 30px 0;
			}

			#jv-similar-container {
				display: none;
				margin: 30px 0;
			}

			#jv-actor-container {
				display: none;
				margin: 30px 0;
			}

			.jv-section-header {
				background: rgba(0, 0, 0, 0.3);
				backdrop-filter: blur(15px);
				padding: 16px 24px;
				border-radius: 12px 12px 0 0;
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-bottom: none;
			}

			.jv-images-grid {
				background: rgba(0, 0, 0, 0.3);
				backdrop-filter: blur(15px);
				padding: 24px;
				border-radius: 0 0 12px 12px;
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-top: none;
			}

			.jv-similar-scroll-container {
				position: relative;
				background: rgba(0, 0, 0, 0.3);
				backdrop-filter: blur(15px);
				padding: 24px;
				border-radius: 0 0 12px 12px;
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-top: none;
			}

			.jv-actor-scroll-container {
				position: relative;
				background: rgba(0, 0, 0, 0.3);
				backdrop-filter: blur(15px);
				padding: 24px;
				border-radius: 0 0 12px 12px;
				border: 1px solid rgba(255, 255, 255, 0.1);
				border-top: none;
			}

			.jv-scroll-btn {
				position: absolute;
				top: 50%;
				transform: translateY(-50%);
				width: 40px;
				height: 40px;
				background: rgba(0, 0, 0, 0.7);
				border: none;
				border-radius: 50%;
				color: white;
				font-size: 24px;
				cursor: pointer;
				z-index: 10;
				display: flex;
				align-items: center;
				justify-content: center;
				transition: all 0.2s ease;
			}

			.jv-scroll-btn:hover {
				background: rgba(0, 164, 220, 0.8);
				transform: translateY(-50%) scale(1.1);
			}

			.jv-scroll-left {
				left: -20px;
			}

			.jv-scroll-right {
				right: -20px;
			}

			.jv-similar-grid {
				display: flex;
				gap: 16px;
				overflow-x: auto;
				scroll-behavior: smooth;
				padding: 10px 0;
				scrollbar-width: none;
			}

			.jv-similar-grid::-webkit-scrollbar {
				display: none;
			}

			.jv-actor-grid {
				display: flex;
				gap: 16px;
				overflow-x: auto;
				scroll-behavior: smooth;
				padding: 10px 0;
				scrollbar-width: none;
			}

			.jv-actor-grid::-webkit-scrollbar {
				display: none;
			}

			.jv-similar-card {
				flex: 0 0 350px;
				cursor: pointer;
				border-radius: 12px;
				overflow: hidden;
				transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
				background: rgba(0, 0, 0, 0.4);
				border: 2px solid transparent;
			}

			.jv-similar-card:hover {
				transform: translateY(-4px) scale(1.02);
				box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
				border-color: rgba(0, 164, 220, 0.5);
			}

			.jv-similar-card-image {
				width: 100%;
				height: 200px;
				overflow: hidden;
				position: relative;
			}

			.jv-similar-card-image.has-trailer {
				box-shadow: 0 0 10px 3px rgba(255, 255, 255, 0.8);
			}

			.jv-similar-card-image.has-trailer:hover {
				box-shadow: 0 0 10px 3px rgba(255, 0, 150, 0.3);
			}

			.jv-card-overlay {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				z-index: 1;
			}

			.jv-similar-card-image img {
				width: 100%;
				height: 100%;
				object-fit: cover;
				transition: transform 0.3s ease, filter 0.3s ease;
			}
			
			.jv-card-overlay video::-webkit-media-controls-panel {
				background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.8));
			}
			
			.jv-card-overlay video::-webkit-media-controls-timeline {
				cursor: pointer;
			}
			
			.jv-card-overlay iframe {
				pointer-events: auto !important;
			}

			.jv-similar-card:hover .jv-similar-card-image img {
				transform: scale(1.05);
			}

			.jv-similar-card-info {
				padding: 12px;
			}

			.jv-similar-card-name {
				font-size: 14px;
				font-weight: 500;
				color: #ffffff;
				margin-bottom: 4px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.jv-similar-card-year {
				font-size: 12px;
				color: rgba(255, 255, 255, 0.6);
			}

			.jv-copy-code {
				display: inline-block;
				padding: 2px 6px;
				background: rgba(173, 216, 230, 0.1);
				border-radius: 4px;
				transition: all 0.2s ease;
			}

			.jv-copy-code:hover {
				background: rgba(173, 216, 230, 0.2);
				transform: scale(1.05);
			}

			.jv-copy-code:active {
				transform: scale(0.95) !important;
			}

			.jv-web-links-container {
				display: flex;
				flex-wrap: wrap;
				gap: 8px;
				margin: 8px 0 12px 0;
				padding: 0;
			}

			.jv-web-link {
				display: inline-block;
				padding: 4px 10px;
				background: transparent;
				font-weight: 600;
				font-family: 'Poppins', sans-serif;
				text-decoration: none;
				border-radius: 4px;
				font-size: 12px;
				text-transform: uppercase;
				transition: transform 0.2s ease, background-color 0.3s ease, box-shadow 0.3s ease, color 0.3s ease;
				border: 1px solid currentColor;
				opacity: 0.85;
			}

			.jv-web-link:hover {
				transform: scale(1.08);
				opacity: 1;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
			}

			.jv-web-link:active {
				transform: scale(0.95);
			}

			.jv-section-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
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
				pointer-events: none;
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

			/* JavDB 短评弹窗样式 */
			.jv-reviews-modal {
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				z-index: 10000;
				display: flex;
				justify-content: center;
				align-items: center;
				opacity: 0;
				transition: opacity 0.2s ease;
			}

			.jv-reviews-modal.visible {
				opacity: 1;
			}

			.jv-reviews-modal.closing {
				opacity: 0;
			}

			.jv-reviews-backdrop {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: rgba(0, 0, 0, 0.8);
				backdrop-filter: blur(8px);
			}

			.jv-reviews-content {
				position: relative;
				width: 90%;
				max-width: 600px;
				max-height: 80vh;
				background: #1a1a1a;
				border-radius: 16px;
				display: flex;
				flex-direction: column;
				overflow: hidden;
				box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
				border: 1px solid rgba(255, 255, 255, 0.1);
				transform: scale(0.95);
				transition: transform 0.2s ease;
			}

			.jv-reviews-modal.visible .jv-reviews-content {
				transform: scale(1);
			}

			.jv-reviews-header {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
				padding: 20px 24px;
				border-bottom: 1px solid rgba(255, 255, 255, 0.1);
				background: rgba(0, 164, 220, 0.1);
			}

			.jv-reviews-title-wrapper {
				flex: 1;
			}

			.jv-reviews-title {
				margin: 0;
				font-size: 20px;
				font-weight: 600;
				color: #fff;
			}

			.jv-reviews-subtitle {
				display: block;
				margin-top: 4px;
				font-size: 13px;
				color: rgba(255, 255, 255, 0.6);
			}

			.jv-reviews-close {
				background: none;
				border: none;
				padding: 8px;
				cursor: pointer;
				color: rgba(255, 255, 255, 0.6);
				transition: color 0.2s;
				margin: -8px -8px 0 0;
			}

			.jv-reviews-close:hover {
				color: #fff;
			}

			.jv-reviews-close svg {
				width: 20px;
				height: 20px;
			}

			/* 凭据输入弹窗样式 */
			.jv-credentials-content {
				position: relative;
				width: 90%;
				max-width: 420px;
				background: #1a1a1a;
				border-radius: 16px;
				display: flex;
				flex-direction: column;
				overflow: hidden;
				box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
				border: 1px solid rgba(255, 255, 255, 0.1);
				transform: scale(0.95);
				transition: transform 0.2s ease;
			}

			.jv-reviews-modal.visible .jv-credentials-content {
				transform: scale(1);
			}

			.jv-credentials-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 20px 24px;
				border-bottom: 1px solid rgba(255, 255, 255, 0.1);
				background: rgba(0, 164, 220, 0.1);
			}

			.jv-credentials-title {
				margin: 0;
				font-size: 18px;
				font-weight: 600;
				color: #fff;
			}

			.jv-credentials-body {
				padding: 24px;
			}

			.jv-credentials-desc {
				margin: 0 0 20px 0;
				font-size: 14px;
				color: rgba(255, 255, 255, 0.8);
				line-height: 1.5;
			}

			.jv-credentials-desc small {
				color: rgba(255, 255, 255, 0.5);
			}

			.jv-credentials-form {
				display: flex;
				flex-direction: column;
				gap: 16px;
			}

			.jv-form-group {
				display: flex;
				flex-direction: column;
				gap: 6px;
			}

			.jv-form-group label {
				font-size: 13px;
				color: rgba(255, 255, 255, 0.7);
				font-weight: 500;
			}

			.jv-form-group input {
				padding: 12px 14px;
				background: rgba(255, 255, 255, 0.1);
				border: 1px solid rgba(255, 255, 255, 0.2);
				border-radius: 8px;
				color: #fff;
				font-size: 14px;
				outline: none;
				transition: all 0.2s;
			}

			.jv-form-group input:focus {
				border-color: #00a4dc;
				background: rgba(255, 255, 255, 0.15);
			}

			.jv-form-group input::placeholder {
				color: rgba(255, 255, 255, 0.4);
			}

			.jv-credentials-error {
				margin-top: 12px;
				padding: 10px 14px;
				background: rgba(220, 53, 69, 0.2);
				border: 1px solid rgba(220, 53, 69, 0.4);
				border-radius: 6px;
				color: #ff6b6b;
				font-size: 13px;
			}

			.jv-credentials-footer {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 16px 24px;
				border-top: 1px solid rgba(255, 255, 255, 0.1);
				background: rgba(0, 0, 0, 0.3);
				gap: 12px;
			}

			.jv-credentials-actions {
				display: flex;
				gap: 10px;
				margin-left: auto;
			}

			.jv-btn {
				padding: 10px 20px;
				border: none;
				border-radius: 8px;
				font-size: 14px;
				font-weight: 500;
				cursor: pointer;
				transition: all 0.2s;
			}

			.jv-btn-primary {
				background: #00a4dc;
				color: #fff;
			}

			.jv-btn-primary:hover {
				background: #0090c4;
			}

			.jv-btn-primary:disabled {
				background: #555;
				cursor: not-allowed;
			}

			.jv-btn-secondary {
				background: rgba(255, 255, 255, 0.1);
				color: rgba(255, 255, 255, 0.8);
			}

			.jv-btn-secondary:hover {
				background: rgba(255, 255, 255, 0.2);
			}

			.jv-btn-danger {
				background: transparent;
				color: #ff6b6b;
				padding: 10px 14px;
				font-size: 13px;
			}

			.jv-btn-danger:hover {
				background: rgba(220, 53, 69, 0.2);
			}

			.jv-reviews-sort-hint {
				display: flex;
				align-items: center;
				padding: 8px 24px;
				border-bottom: 1px solid rgba(255, 255, 255, 0.05);
				font-size: 12px;
				color: rgba(255, 255, 255, 0.5);
			}

			.jv-reviews-list {
				flex: 1;
				overflow-y: auto;
				padding: 16px 24px;
			}

			.jv-reviews-loading,
			.jv-reviews-empty {
				text-align: center;
				padding: 40px 20px;
				color: rgba(255, 255, 255, 0.5);
			}

			.jv-review-item {
				padding: 16px 0;
				border-bottom: 1px solid rgba(255, 255, 255, 0.05);
			}

			.jv-review-item:last-child {
				border-bottom: none;
			}

			.jv-review-header {
				display: flex;
				align-items: center;
				gap: 12px;
				margin-bottom: 10px;
			}

			.jv-review-avatar {
				width: 36px;
				height: 36px;
				border-radius: 50%;
				object-fit: cover;
				background: #333;
			}

			.jv-review-user-info {
				flex: 1;
			}

			.jv-review-username {
				font-size: 14px;
				font-weight: 500;
				color: #fff;
				display: flex;
				align-items: center;
				gap: 6px;
			}

			.jv-review-tag {
				font-size: 10px;
				padding: 2px 6px;
				border-radius: 4px;
				font-weight: normal;
			}

			.jv-review-tag.vip {
				background: linear-gradient(135deg, #ffd700, #ffaa00);
				color: #000;
			}

			.jv-review-tag.contributor {
				background: #00a4dc;
				color: #fff;
			}

			.jv-review-meta {
				display: flex;
				align-items: center;
				gap: 8px;
				margin-top: 2px;
				font-size: 12px;
				color: rgba(255, 255, 255, 0.5);
			}

			.jv-review-score {
				color: #ffd700;
				font-weight: 500;
			}

			.jv-review-content {
				font-size: 14px;
				line-height: 1.6;
				color: rgba(255, 255, 255, 0.9);
				word-break: break-word;
			}

			.jv-review-footer {
				display: flex;
				justify-content: flex-end;
				margin-top: 10px;
			}

			.jv-review-likes {
				display: flex;
				align-items: center;
				gap: 4px;
				font-size: 12px;
				color: rgba(255, 255, 255, 0.5);
			}

			.jv-review-likes svg {
				opacity: 0.7;
			}

			.jv-reviews-pagination {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 12px 24px;
				border-top: 1px solid rgba(255, 255, 255, 0.1);
				background: rgba(0, 0, 0, 0.3);
			}

			.jv-reviews-page-info {
				font-size: 13px;
				color: rgba(255, 255, 255, 0.6);
			}

			.jv-reviews-page-btns {
				display: flex;
				gap: 8px;
			}

			.jv-page-btn {
				background: rgba(255, 255, 255, 0.1);
				border: none;
				padding: 6px 14px;
				border-radius: 6px;
				color: #fff;
				font-size: 13px;
				cursor: pointer;
				transition: all 0.2s;
			}

			.jv-page-btn:hover:not(:disabled) {
				background: rgba(255, 255, 255, 0.2);
			}

			.jv-page-btn:disabled {
				opacity: 0.4;
				cursor: not-allowed;
			}

			.jv-javdb-review-btn {
				font-size: 12px !important;
			}

			@media (max-width: 1200px) {
				.jv-images-grid {
					grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
					gap: 12px;
				}
			}

			@media (max-width: 768px) {
				#jv-image-container {
					margin: 20px 0;
				}

				#jv-similar-container {
					margin: 20px 0;
				}

				.jv-section-header {
					padding: 12px 16px;
				}

				.jv-images-grid {
					padding: 16px;
					grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
					gap: 10px;
				}

				.jv-similar-scroll-container {
					padding: 16px;
				}

				.jv-section-title {
					font-size: 20px;
				}

				.jv-title-icon {
					width: 24px;
					height: 24px;
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

	// 演员其他作品功能
	static async loadActorMoreItems() {
		if (!this.itemId || typeof ApiClient === 'undefined') return;
		
		// 立即隐藏所有演员容器，避免显示旧内容或空白框
		let containerIndex = 0;
		while (true) {
			const containerId = containerIndex === 0 ? 'jv-actor-container' : `jv-actor-container-${containerIndex}`;
			const container = document.querySelector(`#${containerId}`);
			if (container) {
				container.style.display = 'none';
				container.removeAttribute('data-item-id');
				containerIndex++;
			} else {
				break;
			}
		}
		
		// 检查是否还在详情页
		if (!this.isDetailsPage()) {
			console.log('[ExtraFanart] 已离开详情页，取消加载演员作品');
			return;
		}
		
		try {
			const item = await ApiClient.getItem(ApiClient.getCurrentUserId(), this.itemId);
			if (!item || item.Type !== 'Movie') return;
			
			// 获取演员名字（最多3个）
			const actorNames = this.getActorNames(item, 3);
			if (actorNames.length === 0) return;
			
			console.log('[ExtraFanart] 找到', actorNames.length, '个演员:', actorNames);
			
			// 为每个演员获取其他影片
			const actorsData = [];
			for (const actorName of actorNames) {
				const moreItems = await this.getActorMovies(actorName, item.Id);
				if (moreItems && moreItems.length > 0) {
					actorsData.push({ actorName, items: moreItems });
					console.log('[ExtraFanart]', actorName, '的作品数:', moreItems.length);
				}
			}
			
		if (actorsData.length === 0) return;
		
		// 保存加载时的 itemId，用于后续检查
		const loadedItemId = this.itemId;
		
		// 无论是否在详情页，都先缓存数据，以便返回时恢复
		this.cachedActorItems.set(loadedItemId, { actors: actorsData });
		console.log('[ExtraFanart] 已缓存', actorsData.length, '个演员的作品数据');
		
		// 再次检查是否还在详情页（异步加载期间用户可能离开）
		if (!this.isDetailsPage()) {
			console.log('[ExtraFanart] 加载完成后检查：已离开详情页，数据已缓存但取消显示');
			return;
		}
		
		// 最终检查：确保 itemId 没有变化（用户可能快速切换页面）
		if (this.itemId !== loadedItemId) {
			console.log('[ExtraFanart] itemId已变化，取消显示演员作品', { loaded: loadedItemId, current: this.itemId });
			return;
		}
		
		// 显示所有演员的作品
		this.displayAllActorsItems(actorsData);		} catch (error) {
			console.error('[ExtraFanart] 加载演员作品失败:', error);
		}
	}

	static displayCachedActorItems(itemId) {
		console.log('[ExtraFanart] displayCachedActorItems 调用', { itemId, hasCache: this.cachedActorItems.has(itemId) });
		
		// 检查 itemId 是否匹配，防止显示错误的缓存
		if (this.itemId !== itemId) {
			console.log('[ExtraFanart] itemId不匹配，取消显示缓存的演员作品', { cached: itemId, current: this.itemId });
			return;
		}
		
		const cachedActorInfo = this.cachedActorItems.get(itemId);
		if (!cachedActorInfo) {
			console.log('[ExtraFanart] 没有找到缓存的演员作品');
			return;
		}
		
		// 立即隐藏所有演员容器，防止显示旧内容
		let containerIndex = 0;
		while (true) {
			const containerId = containerIndex === 0 ? 'jv-actor-container' : `jv-actor-container-${containerIndex}`;
			const container = document.querySelector(`#${containerId}`);
			if (container) {
				container.style.display = 'none';
				container.removeAttribute('data-item-id');
				containerIndex++;
			} else {
				break;
			}
		}
		
		// 兼容旧格式（单个演员）和新格式（多个演员）
		const actorsData = cachedActorInfo.actors || [{ actorName: cachedActorInfo.actorName, items: cachedActorInfo.items }];
		console.log('[ExtraFanart] 找到缓存的演员作品，演员数:', actorsData.length);
		
		console.log('[ExtraFanart] 显示演员作品容器');
		this.displayAllActorsItems(actorsData);
	}

	static getActorNames(item, maxCount = 3) {
		// 从 People 中获取演员，最多取前 maxCount 个
		const actors = item.People?.filter(person => person.Type === 'Actor') || [];
		if (actors.length === 0) return [];
		
		// 返回前 maxCount 个演员的名字
		return actors.slice(0, maxCount).map(actor => actor.Name);
	}

	static async getActorMovies(actorName, currentItemId) {
		try {
			const result = await ApiClient.getItems(ApiClient.getCurrentUserId(), {
				Recursive: true,
				IncludeItemTypes: 'Movie',
				Fields: 'ProductionYear,PrimaryImageAspectRatio,RemoteTrailers,LocalTrailerCount',
				Person: actorName,
				Limit: 100
			});
			
			if (!result || !result.Items || result.Items.length === 0) return [];
			
			// 过滤掉当前影片，随机排序，取前24个（除非不足24）
			let items = result.Items.filter(movie => movie.Id !== currentItemId);
			items.sort(() => Math.random() - 0.5);
			return items.slice(0, 24);
			
		} catch (error) {
			console.error('[ExtraFanart] 获取演员影片失败:', error);
			return [];
		}
	}

	// 显示所有演员的作品（支持多个演员）
	static displayAllActorsItems(actorsData) {
		if (!actorsData || actorsData.length === 0) return;
		
		console.log('[ExtraFanart] 准备显示', actorsData.length, '个演员的作品');
		
		// 依次显示每个演员的作品
		for (let i = 0; i < actorsData.length; i++) {
			const { actorName, items } = actorsData[i];
			this.displayActorMoreItems(actorName, items, i);
		}
	}

	static displayActorMoreItems(actorName, items, actorIndex = 0) {
		if (!items || items.length === 0) return;
		
		// 检查是否还在详情页
		if (!this.isDetailsPage()) {
			console.log(`[ExtraFanart] 已离开详情页，取消显示演员作品${actorIndex}`);
			return;
		}
		
		// 根据索引生成不同的容器ID
		const containerId = actorIndex === 0 ? 'jv-actor-container' : `jv-actor-container-${actorIndex}`;
		
		// 创建或获取容器
		let actorContainer = document.querySelector(`#${containerId}`);
		if (actorContainer) {
			// 检查容器的itemId是否匹配
			const containerItemId = actorContainer.getAttribute('data-item-id');
			if (containerItemId === this.itemId) {
				// itemId匹配，检查是否已有内容
				const gridContainer = actorContainer.querySelector('.jv-actor-grid');
				const hasContent = gridContainer && gridContainer.children.length > 0;
				const isVisible = actorContainer.style.display === 'block';
				const detailPage = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
				const inDOM = detailPage && detailPage.contains(actorContainer);
				
				if (isVisible && hasContent && inDOM) {
					console.log(`[ExtraFanart] 演员作品容器${actorIndex}已存在且匹配，跳过`);
					return;
				}
			}
			// itemId不匹配或内容不对，需要重建
			actorContainer.style.display = 'none'; // 重置为隐藏状态
			console.log(`[ExtraFanart] 演员作品容器${actorIndex} itemId不匹配，重建`);
		} else {
			actorContainer = document.createElement('div');
			actorContainer.id = containerId;
			actorContainer.className = 'imageSection itemsContainer padded-left padded-left-page padded-right vertical-wrap';
			actorContainer.style.display = 'none'; // 初始隐藏，等内容加载完成后再显示
			console.log(`[ExtraFanart] 创建新的演员作品容器${actorIndex}`);
		}
		
		actorContainer.innerHTML = `
			<div class="jv-section-header">
				<h2 class="jv-section-title jv-actor-title">
					<svg class="jv-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
						<circle cx="12" cy="7" r="4"></circle>
					</svg>
					${actorName} 其他作品
				</h2>
			</div>
			<div class="jv-actor-scroll-container">
				<button class="jv-scroll-btn jv-scroll-left" style="display:none;">‹</button>
				<div class="jv-actor-grid"></div>
				<button class="jv-scroll-btn jv-scroll-right">›</button>
			</div>
		`;
		
		console.log('[ExtraFanart] 准备添加', items.length, '个演员作品');
		const gridContainer = actorContainer.querySelector('.jv-actor-grid');
		
		// 添加内容到容器（此时容器仍然隐藏）
		items.forEach(item => {
			const card = this.createActorCard(item);
			gridContainer.appendChild(card);
		});
		
		// 确保容器在正确的详情页DOM中
		const detailPage = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
		const isInCorrectPage = detailPage && detailPage.contains(actorContainer);
		
		console.log('[ExtraFanart] 演员作品容器DOM检查:', {
			detailPageExists: !!detailPage,
			containerInDOM: document.body.contains(actorContainer),
			containerInCorrectPage: isInCorrectPage
		});
		
		// 如果容器不在正确的详情页中，需要重新插入
		if (!isInCorrectPage && actorContainer.parentNode) {
			console.log('[ExtraFanart] 容器在错误位置，移除后重新插入');
			actorContainer.parentNode.removeChild(actorContainer);
		}
		
		// 插入逻辑：多个演员容器应该连续排列
		const detailPageForInsert = document.querySelector('#itemDetailPage:not(.hide), .itemView:not(.hide)');
		const similarContainer = detailPageForInsert ? detailPageForInsert.querySelector('#jv-similar-container') : null;
		const imageContainer = detailPageForInsert ? detailPageForInsert.querySelector('#jv-image-container') : null;
		const castSection = document.querySelector('#itemDetailPage:not(.hide) #castCollapsible') ||
		                    document.querySelector('.itemView:not(.hide) .peopleSection');
		
		// 查找前一个演员容器
		let previousActorContainer = null;
		if (actorIndex > 0) {
			const previousContainerId = actorIndex === 1 ? 'jv-actor-container' : `jv-actor-container-${actorIndex - 1}`;
			previousActorContainer = detailPageForInsert ? detailPageForInsert.querySelector(`#${previousContainerId}`) : null;
		}
		
		console.log(`[ExtraFanart] 演员作品${actorIndex}插入位置检查:`, {
			hasDetailPage: !!detailPageForInsert,
			hasSimilarContainer: !!similarContainer,
			hasImageContainer: !!imageContainer,
			hasPreviousActorContainer: !!previousActorContainer
		});
		
		// 尝试插入位置
		let inserted = false;
		
		// 优先：如果有前一个演员容器，插入到它后面（保证连续排列）
		if (previousActorContainer && document.body.contains(previousActorContainer)) {
			if (!document.body.contains(actorContainer)) {
				previousActorContainer.insertAdjacentElement('afterend', actorContainer);
				inserted = true;
				console.log(`[ExtraFanart] 演员作品${actorIndex}插入到演员作品${actorIndex - 1}之后`);
			} else if (actorContainer.previousElementSibling !== previousActorContainer) {
				previousActorContainer.insertAdjacentElement('afterend', actorContainer);
				inserted = true;
				console.log(`[ExtraFanart] 演员作品${actorIndex}移动到演员作品${actorIndex - 1}之后`);
			}
		} else if (actorIndex === 0) {
			// 第一个演员容器：根据相似影片或剧照来定位
			// 检查相似影片是否真正加载完成（不仅在DOM中，还要有内容、显示状态、itemId匹配）
			const isSimilarReady = similarContainer && 
			                       document.body.contains(similarContainer) &&
			                       similarContainer.style.display !== 'none' &&
			                       similarContainer.getAttribute('data-item-id') === this.itemId &&
			                       similarContainer.querySelector('.jv-similar-grid')?.children.length > 0;
			
			console.log('[ExtraFanart] 相似影片容器就绪检查:', {
				exists: !!similarContainer,
				inDOM: similarContainer ? document.body.contains(similarContainer) : false,
				display: similarContainer?.style.display,
				itemId: similarContainer?.getAttribute('data-item-id'),
				currentItemId: this.itemId,
				hasContent: similarContainer?.querySelector('.jv-similar-grid')?.children.length || 0,
				isSimilarReady
			});
			
			if (isSimilarReady) {
				// 如果相似影片真正加载完成，插入到它后面
				if (!document.body.contains(actorContainer)) {
					similarContainer.insertAdjacentElement('afterend', actorContainer);
					inserted = true;
					console.log('[ExtraFanart] 演员作品0插入到相似影片之后（相似影片先完成）');
				} else if (actorContainer.previousElementSibling !== similarContainer) {
					similarContainer.insertAdjacentElement('afterend', actorContainer);
					inserted = true;
					console.log('[ExtraFanart] 演员作品0移动到相似影片之后（相似影片先完成）');
				}
			} else if (imageContainer && document.body.contains(imageContainer)) {
				// 相似影片还没加载，直接插到剧照后面
				if (!document.body.contains(actorContainer)) {
					imageContainer.insertAdjacentElement('afterend', actorContainer);
					inserted = true;
					console.log('[ExtraFanart] 演员作品0插入到剧照之后（相似影片未加载）');
				}
			} else if (castSection && document.body.contains(castSection)) {
				// 最后插入到演员信息之后
				if (!document.body.contains(actorContainer)) {
					castSection.insertAdjacentElement('afterend', actorContainer);
					inserted = true;
				}
			}
		}
		
		// 如果都没有找到，延迟重试
		if (!inserted) {
			setTimeout(() => {
				if (previousActorContainer && document.body.contains(previousActorContainer)) {
					// 有前一个演员容器，直接插入到它后面
					if (!document.body.contains(actorContainer)) {
						previousActorContainer.insertAdjacentElement('afterend', actorContainer);
					}
				} else {
					// 第一个演员容器，尝试其他锚点
					const retrySimilar = document.querySelector('#jv-similar-container');
					const retryImage = document.querySelector('#jv-image-container');
					const retryCast = document.querySelector('#itemDetailPage:not(.hide) #castCollapsible') ||
					                  document.querySelector('.itemView:not(.hide) .peopleSection');
					
					if (!document.body.contains(actorContainer)) {
						// 检查相似影片是否真正完成
						const isSimilarReady = retrySimilar && 
						                       document.body.contains(retrySimilar) &&
						                       retrySimilar.style.display !== 'none' &&
						                       retrySimilar.getAttribute('data-item-id') === this.itemId &&
						                       retrySimilar.querySelector('.jv-similar-grid')?.children.length > 0;
						
						if (isSimilarReady) {
							retrySimilar.insertAdjacentElement('afterend', actorContainer);
						} else if (retryImage && document.body.contains(retryImage)) {
							retryImage.insertAdjacentElement('afterend', actorContainer);
						} else if (retryCast && document.body.contains(retryCast)) {
							retryCast.insertAdjacentElement('afterend', actorContainer);
						}
					}
				}
				actorContainer.style.display = 'block';
			}, 300);
		}
		
		// 内容加载完成，显示容器
		actorContainer.style.display = 'block';
		actorContainer.setAttribute('data-item-id', this.itemId);
		console.log(`[ExtraFanart] 演员作品容器${actorIndex}已显示 (${actorName}), itemId:`, this.itemId);
		
		// 添加刷新功能
		const titleElement = actorContainer.querySelector('.jv-actor-title');
		if (titleElement) {
			titleElement.style.cursor = 'pointer';
			titleElement.title = '点击刷新';
			titleElement.onclick = () => this.loadActorMoreItems();
		}
		
		// 添加横向滚动功能
		this.setupActorScrollButtons(actorContainer);
		
		// 添加悬停预告片效果
		setTimeout(() => {
			this.addHoverTrailerEffectForActor();
		}, 100);
	}

	static createActorCard(item) {
		const card = document.createElement('div');
		card.className = 'jv-similar-card';
		card.dataset.itemId = item.Id;
		card.dataset.localTrailerCount = item.LocalTrailerCount || 0;
		
		// 优先使用横版封面
		let imgUrl = '';
		if (item.ImageTags && item.ImageTags.Thumb) {
			imgUrl = ApiClient.getImageUrl(item.Id, {
				type: 'Thumb',
				tag: item.ImageTags.Thumb,
				maxHeight: 360,
				maxWidth: 640
			});
		} else if (item.ImageTags && item.ImageTags.Primary) {
			imgUrl = ApiClient.getImageUrl(item.Id, {
				type: 'Primary',
				tag: item.ImageTags.Primary,
				maxHeight: 330,
				maxWidth: 220
			});
		}
		
		const year = item.ProductionYear || '';
		const name = item.Name || '';
		// 使用 RemoteTrailers 判断是否有预告片
		const hasTrailer = (item.RemoteTrailers && item.RemoteTrailers.length > 0) || (item.LocalTrailerCount || 0) > 0;
		
		card.innerHTML = `
			<div class="jv-similar-card-image ${hasTrailer ? 'has-trailer' : ''}">
				<img src="${imgUrl}" alt="${name}" loading="lazy" />
				<div class="jv-card-overlay"></div>
			</div>
			<div class="jv-similar-card-info">
				<div class="jv-similar-card-name" title="${name}">${name}</div>
				<div class="jv-similar-card-year">${year}</div>
			</div>
		`;
		
		card.onclick = () => {
			if (typeof Emby !== 'undefined' && Emby.Page && Emby.Page.showItem) {
				Emby.Page.showItem(item.Id);
			} else {
				window.location.hash = `#!/item?id=${item.Id}`;
			}
		};
		
		return card;
	}

	static setupActorScrollButtons(container) {
		const scrollContainer = container.querySelector('.jv-actor-scroll-container');
		const grid = container.querySelector('.jv-actor-grid');
		const leftBtn = container.querySelector('.jv-scroll-left');
		const rightBtn = container.querySelector('.jv-scroll-right');
		
		if (!scrollContainer || !grid || !leftBtn || !rightBtn) return;
		
		const scrollAmount = 400;
		
		const updateButtons = () => {
			const scrollLeft = grid.scrollLeft;
			const maxScroll = grid.scrollWidth - grid.clientWidth;
			
			leftBtn.style.display = scrollLeft > 0 ? 'flex' : 'none';
			rightBtn.style.display = scrollLeft < maxScroll - 10 ? 'flex' : 'none';
		};
		
		leftBtn.onclick = () => {
			grid.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
			setTimeout(updateButtons, 300);
		};
		
		rightBtn.onclick = () => {
			grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
			setTimeout(updateButtons, 300);
		};
		
		grid.addEventListener('scroll', updateButtons);
		updateButtons();
	}

	static addHoverTrailerEffectForActor() {
		// 如果是触摸设备，不添加悬停效果
		if ('ontouchstart' in window) return;
		
		// 获取所有演员容器（包括 #jv-actor-container, #jv-actor-container-1, #jv-actor-container-2）
		const actorContainers = document.querySelectorAll('[id^="jv-actor-container"]');
		if (!actorContainers.length) return;
		
		actorContainers.forEach(actorContainer => {
			const cards = actorContainer.querySelectorAll('.jv-similar-card');
		
		cards.forEach((card, index) => {
			const imageContainer = card.querySelector('.jv-similar-card-image');
			const hasTrailer = imageContainer && imageContainer.classList.contains('has-trailer');
			
			if (!imageContainer || !hasTrailer) return;
			
			const img = imageContainer.querySelector('img');
			const overlay = imageContainer.querySelector('.jv-card-overlay');
			const itemId = card.dataset.itemId;
			
			let isHovered = false;
			let videoElement = null;
			let expandBtn = null;
			let currentTrailerUrl = null;
			
			card.addEventListener('mouseenter', () => {
				isHovered = true;
				img.style.filter = 'blur(5px)';
				
				// 异步加载预告片
				ExtraFanart.getTrailerUrlForHover(itemId).then(trailerUrl => {
					if (!isHovered || !trailerUrl) return;
					
					currentTrailerUrl = trailerUrl;
					
					// 检查是否是 YouTube 链接
					const isYouTube = ExtraFanart.isYouTubeUrl(trailerUrl);
					
					// 创建放大按钮
					expandBtn = document.createElement('button');
					expandBtn.className = 'jv-expand-btn';
					expandBtn.innerHTML = `
						<svg viewBox="0 0 24 24" width="20" height="20" fill="white">
							<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
						</svg>
					`;
					expandBtn.style.cssText = `
						position: absolute;
						top: 8px;
						right: 8px;
						width: 32px;
						height: 32px;
						background: rgba(0, 0, 0, 0.6);
						border: 1px solid rgba(255, 255, 255, 0.3);
						border-radius: 4px;
						cursor: pointer;
						display: flex;
						align-items: center;
						justify-content: center;
						z-index: 10;
						opacity: 0;
						transition: all 0.2s ease;
						backdrop-filter: blur(4px);
					`;
					expandBtn.title = '全屏播放';
					
					expandBtn.onmouseenter = () => {
						expandBtn.style.background = 'rgba(0, 0, 0, 0.8)';
						expandBtn.style.transform = 'scale(1.1)';
					};
					
					expandBtn.onmouseleave = () => {
						expandBtn.style.background = 'rgba(0, 0, 0, 0.6)';
						expandBtn.style.transform = 'scale(1)';
					};
					
					expandBtn.onclick = (e) => {
						e.stopPropagation();
						console.log('[ExtraFanart] 放大按钮被点击（演员作品）', { trailerUrl: currentTrailerUrl, isYouTube });
						// 打开全屏播放器
						ExtraFanart.openVideoPlayer(currentTrailerUrl, isYouTube);
					};
					
					// 将按钮添加到 imageContainer 而不是 overlay，避免层级问题
					imageContainer.appendChild(expandBtn);
					
					// 延迟显示按钮
					setTimeout(() => {
						if (expandBtn && isHovered) {
							expandBtn.style.opacity = '1';
						}
					}, 300);
					
					if (isYouTube) {
						// 使用 iframe 播放 YouTube 视频
						const embedUrl = ExtraFanart.convertYouTubeUrl(trailerUrl);
						
						if (embedUrl) {
							videoElement = document.createElement('iframe');
							videoElement.src = embedUrl;
							videoElement.frameBorder = '0';
							videoElement.allow = 'autoplay; encrypted-media';
							videoElement.setAttribute('disablePictureInPicture', 'true');
							videoElement.style.cssText = `
								position: absolute;
								top: 0;
								left: 0;
								width: 100%;
								height: 100%;
								border: none;
								opacity: 0;
								transition: opacity 0.3s ease;
								z-index: 2;
								pointer-events: auto;
							`;
							overlay.appendChild(videoElement);
							
							if (isHovered) {
								setTimeout(() => {
									if (videoElement) {
										videoElement.style.opacity = '1';
									}
								}, 50);
							}
						}
					} else {
						// 使用 video 标签播放普通视频
						videoElement = document.createElement('video');
						videoElement.src = trailerUrl;
						videoElement.autoplay = true;
						videoElement.loop = true;
						videoElement.playsInline = true;
						videoElement.controls = true;
						videoElement.disablePictureInPicture = true;
						videoElement.controlsList = 'nodownload nofullscreen noremoteplayback';
						// 默认静音播放
						videoElement.muted = true;
						videoElement.defaultMuted = true;
						videoElement.volume = 0;
						videoElement.style.cssText = `
							position: absolute;
							top: 0;
							left: 0;
							width: 100%;
							height: 100%;
							object-fit: cover;
							opacity: 0;
							transition: opacity 0.3s ease;
							z-index: 2;
						`;
						
						// 监听音量变化，只在用户主动操作时记录
						let userInteracted = false;
						videoElement.addEventListener('volumechange', function() {
							if (userInteracted) {
								if (!this.muted && this.volume > 0) {
									localStorage.setItem('jv-trailer-volume', this.volume);
									localStorage.setItem('jv-trailer-muted', 'false');
								} else if (this.muted) {
									localStorage.setItem('jv-trailer-muted', 'true');
								}
							}
						});
						
						// 标记用户交互
						videoElement.addEventListener('click', function() { userInteracted = true; });
						videoElement.addEventListener('mousedown', function() { userInteracted = true; });
						
						// 延迟恢复用户设置，避免初始化时触发
						setTimeout(() => {
							if (videoElement) {
								const savedVolume = localStorage.getItem('jv-trailer-volume');
								const savedMuted = localStorage.getItem('jv-trailer-muted');
								if (savedMuted === 'false' && savedVolume) {
									videoElement.muted = false;
									videoElement.volume = parseFloat(savedVolume);
								}
								userInteracted = true; // 设置完成后允许记录变化
							}
						}, 100);
						
						overlay.appendChild(videoElement);
						
						if (isHovered) {
							setTimeout(() => {
								if (videoElement) {
									videoElement.style.opacity = '1';
								}
							}, 50);
						}
					}
				});
			});
			
			card.addEventListener('mouseleave', () => {
				isHovered = false;
				img.style.filter = '';
				
				if (videoElement) {
					videoElement.remove();
					videoElement = null;
				}
				
				if (expandBtn && expandBtn.parentNode) {
					expandBtn.parentNode.removeChild(expandBtn);
					expandBtn = null;
				}
				
				currentTrailerUrl = null;
			});
		});
		});
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
