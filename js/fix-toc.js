/**
 * 修复 Next 主题目录链接和高亮问题 - 增强版
 * 问题1：hexo-toc 插件生成的目录链接缺少 href 属性
 * 问题2：标题的 id 属性在 <span> 标签内，而不是 <h1> 标签上
 * 问题3：主题的 registerSidebarTOC 函数假设链接已有 href，导致 TypeError
 */

// 立即执行，确保在主题脚本之前覆盖函数
(function() {
  console.log('fix-toc.js: 开始执行');

  // 创建全局对象如果不存在
  window.NexT = window.NexT || {};
  window.NexT.utils = window.NexT.utils || {};

  // 保存原始函数（如果已存在）
  const originalRegisterSidebarTOC = window.NexT.utils.registerSidebarTOC;

  // 创建增强版 registerSidebarTOC 函数
  window.NexT.utils.registerSidebarTOC = function() {
    console.log('fix-toc.js: registerSidebarTOC 被调用（使用备用方案）');

    // 先确保所有目录链接都有正确的 href
    ensureTOCLinksHaveHref();

    // 直接使用备用目录功能，完全替换原始实现
    return registerSidebarTOCFallback();
  };

  console.log('fix-toc.js: 已覆盖 registerSidebarTOC 函数');

  // 在 DOM 加载完成后确保目录链接被修复
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTOCFix);
  } else {
    // DOM 已经加载完成
    setTimeout(initTOCFix, 100);
  }
})();

function initTOCFix() {
  console.log('fix-toc.js: 初始化目录修复');

  // 确保目录链接有 href 属性
  ensureTOCLinksHaveHref();

  // 检查是否需要手动触发目录注册
  // 如果 NexT.boot.refresh 还没有被调用，目录功能可能还没有初始化
  const hasTOC = document.querySelector('.post-toc');
  if (hasTOC) {
    // 检查目录链接是否已有点击事件
    const firstLink = document.querySelector('.post-toc .nav-link');
    if (firstLink && !firstLink._hasClickHandler) {
      // 可能主题的目录功能没有正确初始化，手动初始化
      console.log('fix-toc.js: 检测到目录功能未初始化，手动初始化');
      if (window.NexT && window.NexT.utils && window.NexT.utils.registerSidebarTOC) {
        try {
          window.NexT.utils.registerSidebarTOC();
        } catch (err) {
          console.error('fix-toc.js: 手动初始化失败:', err);
        }
      }
    }
  }
}

function ensureTOCLinksHaveHref() {
  const tocLinks = document.querySelectorAll('.post-toc .nav-link');

  if (tocLinks.length === 0) {
    console.log('fix-toc.js: 未找到目录链接');
    return false;
  }

  console.log(`fix-toc.js: 找到 ${tocLinks.length} 个目录链接`);

  let fixedCount = 0;

  tocLinks.forEach((link, index) => {
    // 如果链接已经有 href 属性，跳过
    if (link.hasAttribute('href') && link.getAttribute('href') !== '') {
      return;
    }

    // 获取链接文本
    const textSpan = link.querySelector('.nav-text');
    if (!textSpan) return;

    const text = textSpan.textContent.trim();

    // 查找对应的标题元素
    const headingId = findHeadingIdForTOCLink(text, index);

    if (headingId) {
      link.href = '#' + headingId;
      fixedCount++;
      console.log(`fix-toc.js: 修复链接 ${index} "${text}" -> #${headingId}`);

      // 标记链接已被修复
      link._hrefFixed = true;
    } else {
      console.warn(`fix-toc.js: 无法为链接 ${index} "${text}" 找到对应的标题ID`);
    }
  });

  console.log(`fix-toc.js: 修复了 ${fixedCount}/${tocLinks.length} 个链接的 href 属性`);
  return fixedCount > 0;
}

function findHeadingIdForTOCLink(linkText, linkIndex) {
  // 获取所有可能的标题元素（限制在文章内容内）
  const headings = Array.from(document.querySelectorAll('.post-body h1, .post-body h2, .post-body h3, .post-body h4, .post-body h5, .post-body h6'));

  // 方法1：按索引匹配（最简单，假设顺序一致）
  if (headings[linkIndex]) {
    const heading = headings[linkIndex];
    // 获取标题的 ID（可能在 heading 元素上，也可能在内部的 span 上）
    let headingId = heading.id;
    if (!headingId) {
      const spanWithId = heading.querySelector('[id]');
      if (spanWithId) {
        headingId = spanWithId.id;
      }
    }
    if (headingId) {
      return headingId;
    }
  }

  // 方法2：根据文本内容匹配
  // 清理链接文本，移除序号和标点
  const cleanLinkText = linkText.replace(/^[一二三四五六七八九十、]+/, '').trim();

  for (const heading of headings) {
    const headingText = heading.textContent.trim();

    // 检查标题是否包含链接文本（或反之）
    if (headingText.includes(cleanLinkText) || cleanLinkText.includes(headingText)) {
      // 获取标题的 ID
      let headingId = heading.id;
      if (!headingId) {
        const spanWithId = heading.querySelector('[id]');
        if (spanWithId) {
          headingId = spanWithId.id;
        }
      }
      if (headingId) {
        return headingId;
      }
    }

    // 检查标题内部的 span 是否有 id
    const spanWithId = heading.querySelector('[id]');
    if (spanWithId) {
      const spanText = spanWithId.textContent.trim();
      if (spanText.includes(cleanLinkText) || cleanLinkText.includes(spanText)) {
        return spanWithId.id;
      }
    }
  }

  // 方法3：生成可能的 ID 格式并查找
  const possibleIds = generatePossibleIds(linkText);

  for (const id of possibleIds) {
    // 在 heading 元素上查找
    if (document.getElementById(id)) {
      return id;
    }

    // 在 span 元素上查找
    const spanWithId = document.querySelector(`span[id="${id}"]`);
    if (spanWithId) {
      return id;
    }
  }

  return null;
}

function generatePossibleIds(text) {
  // 根据 hexo-toc 和 markdown-it-anchor 的常见 ID 生成规则
  const ids = [];

  // 规则1：小写，空格替换为连字符，移除特殊字符
  const id1 = text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '');

  ids.push(id1);

  // 规则2：URL 编码版本
  ids.push(encodeURIComponent(id1));

  // 规则3：移除所有连字符
  ids.push(id1.replace(/-/g, ''));

  // 规则4：移除所有空格
  ids.push(text.replace(/\s+/g, ''));

  // 规则5：中文常见格式（如：一-下载godot）
  const chineseMatch = text.match(/^([一二三四五六七八九十]+)、(.+)$/);
  if (chineseMatch) {
    const [, chineseNum, rest] = chineseMatch;
    const idWithChinese = chineseNum + '-' + rest
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '');
    ids.push(idWithChinese);
  }

  return [...new Set(ids.filter(id => id && id.length > 0))];
}

function registerSidebarTOCFallback() {
  console.log('fix-toc.js: 使用备用目录功能实现');

  const navItems = document.querySelectorAll('.post-toc li');
  if (navItems.length === 0) return;

  const sections = [];
  const navLinks = [];

  // 收集所有目录链接和对应的标题元素
  navItems.forEach((element, index) => {
    const link = element.querySelector('a.nav-link');
    if (!link || !link.hasAttribute('href')) return;

    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;

    const headingId = href.substring(1);
    const target = document.getElementById(headingId) || document.querySelector(`span[id="${headingId}"]`);

    if (!target) {
      console.warn(`fix-toc.js: 找不到ID为 ${headingId} 的标题元素`);
      return;
    }

    navLinks.push(link);
    sections.push(target);

    // 添加点击事件
    link.addEventListener('click', event => {
      event.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY;
      if (window.anime) {
        window.anime({
          targets: document.scrollingElement,
          duration: 500,
          easing: 'linear',
          scrollTop: offset + 10
        });
      } else {
        window.scrollTo({
          top: offset,
          behavior: 'smooth'
        });
      }
    });

    // 标记链接已有点击事件处理程序
    link._hasClickHandler = true;
  });

  // 设置滚动高亮
  if (sections.length > 0) {
    setupScrollHighlight(navLinks, sections);
  }

  return { navItems: navLinks, sections };
}

function setupScrollHighlight(navLinks, sections) {
  let currentActive = -1;

  function activateNavByIndex(index) {
    if (index === currentActive) return;

    // 移除所有 active 类
    navLinks.forEach(link => {
      link.parentElement.classList.remove('active', 'active-current');
    });

    // 设置当前 active
    if (index >= 0 && index < navLinks.length) {
      const target = navLinks[index].parentElement;
      target.classList.add('active', 'active-current');

      // 递归设置父级 active
      let parent = target.parentElement;
      while (parent && !parent.matches('.post-toc')) {
        if (parent.matches('li')) {
          parent.classList.add('active');
        }
        parent = parent.parentElement;
      }

      currentActive = index;
    }
  }

  function findCurrentIndex() {
    for (let i = sections.length - 1; i >= 0; i--) {
      if (sections[i].getBoundingClientRect().top <= 100) {
        return i;
      }
    }
    return -1;
  }

  // 监听滚动
  window.addEventListener('scroll', () => {
    const index = findCurrentIndex();
    if (index !== currentActive) {
      activateNavByIndex(index);
    }
  });

  // 初始激活
  setTimeout(() => {
    activateNavByIndex(findCurrentIndex());
  }, 100);
}

function scrollToHeading(headingId) {
  // 查找标题元素（可能在 heading 或 span 上）
  let targetElement = document.getElementById(headingId);

  if (!targetElement) {
    // 可能在 span 元素中
    const spanWithId = document.querySelector(`span[id="${headingId}"]`);
    if (spanWithId) {
      targetElement = spanWithId;
    }
  }

  if (!targetElement) {
    console.warn(`fix-toc.js: 找不到ID为 ${headingId} 的元素`);
    return;
  }

  // 确保元素可见（如果是 span，可能需要滚动到其父级 heading）
  const scrollTarget = targetElement.closest('h1, h2, h3, h4, h5, h6') || targetElement;

  // 使用平滑滚动
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({
      top: scrollTarget.offsetTop - 50, // 减去一些偏移量避免被导航栏遮挡
      behavior: 'smooth'
    });
  } else {
    // 不支持平滑滚动的浏览器
    window.scrollTo(0, scrollTarget.offsetTop - 50);
  }

  // 更新 URL hash（不触发页面跳转）
  history.pushState(null, null, '#' + headingId);
}

// 监听 hash 变化，确保页面加载时能滚动到正确位置
window.addEventListener('hashchange', function() {
  const hash = window.location.hash.substring(1);
  if (hash) {
    setTimeout(() => scrollToHeading(hash), 100);
  }
});

// 页面加载时如果有 hash，滚动到对应位置
if (window.location.hash) {
  setTimeout(() => {
    const hash = window.location.hash.substring(1);
    scrollToHeading(hash);
  }, 300);
}