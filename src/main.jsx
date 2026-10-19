import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import './styles.css';
import { LocaleContext, useLocale, translator, languages, initialLanguage, localizedContent, navigationPages } from './i18n';
import { paintings } from './data/paintings';
import { responsiveImage } from './imageProps';
import { exhibitions } from './data/exhibitions';
import { gsap } from 'gsap';
import { revealArtworkScroll } from './galleryCamera';

function PaintingDetail({ selection, onClose }) {
  const { language, t } = useLocale();
  const content = localizedContent(selection.painting, language);
  const dialog = useRef(null);
  const image = useRef(null);
  const artwork = useRef(null);
  const leftPanel = useRef(null);
  const rightPanel = useRef(null);
  const cameraTimeline = useRef(null);
  const mobileClose = useRef(null);
  const cameraStart = useRef(0);
  const backdrop = useRef(null);
  const closeButton = useRef(null);
  const detailPanel = useRef(null);
  const returnScroll = useRef(null);
  const closing = useRef(false);
  const mounted = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(false);
  const cursor = useRef(null);
  const detailImages = [selection.painting.image, ...selection.painting.additionalImages];
  const pointCursor = (event) => {
    if (event.pointerType !== 'mouse') return;
    setCursorVisible(true);
    if (cursor.current) cursor.current.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
  };
  const chooseImage = (index) => {
    if (closing.current) return;
    setCurrentImage(index);
    setCursorVisible(false);
  };
  const bounds = rect => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  const crop = rect => {
    const width = Math.max(rect.width, rect.height * selection.ratio);
    const height = width / selection.ratio;
    const [x, y] = selection.painting.position.split(' ').map(value => parseFloat(value) / 100);
    return { left: (rect.width - width) * x, top: (rect.height - height) * y, width, height };
  };
  const fullImage = rect => ({ left: 0, top: 0, width: rect.width, height: rect.height });
  useLayoutEffect(() => {
    const modal = dialog.current;
    const source = selection.source;
    const room = source?.closest('.gallery-room');
    const scroller = source?.closest('.gallery-viewport');
    const originalScroll = scroller?.scrollLeft;
    let retainedScroll = originalScroll;
    const originalRoomTransform = room && getComputedStyle(room).transform;
    mounted.current = true;
    closing.current = false;
    modal.showModal();
    const destination = artwork.current.getBoundingClientRect();
    const mobileDetail = window.matchMedia('(max-width: 600px)').matches;
    // Temporarily disabled: const mobileFullscreenZoom = mobileDetail;
    // Enable again to zoom through the full-screen painting on mobile.
    const mobileFullscreenZoom = false;
    const screen = modal.getBoundingClientRect();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let flatRoom, flatSource, flatViewport, origin;
    if (room) {
      // Read the wall's layout without its projection, then restore it before paint.
      const previousTransform = room.style.transform;
      room.style.transform = 'none';
      flatRoom = room.getBoundingClientRect();
      flatSource = source.getBoundingClientRect();
      flatViewport = scroller.getBoundingClientRect();
      origin = getComputedStyle(room).transformOrigin.split(' ').map(parseFloat);
      room.style.transform = previousTransform;
    }
    const context = gsap.context(() => {
      gsap.set(detailPanel.current, { '--detail-content-top': `${destination.bottom + 28}px` });
      if (reducedMotion || !room) {
        gsap.set(artwork.current, { ...bounds(destination), translate: 'none', autoAlpha: 1 });
        gsap.set(image.current, fullImage(destination));
        gsap.set(backdrop.current, { autoAlpha: 1 });
        if (source) gsap.set(source, { opacity: 0 });
        return;
      }
      const revealScroll = Math.max(0, Math.min(scroller.scrollWidth - scroller.clientWidth,
        revealArtworkScroll(flatViewport, flatSource, originalScroll)));
      const scrollShift = revealScroll - originalScroll;
      const revealDuration = Math.abs(scrollShift) > 1 ? 0.9 : 0;
      retainedScroll = revealScroll;
      cameraStart.current = revealDuration;
      // Compute camera focus at the position after the canvas has been revealed.
      flatSource = { left: flatSource.left - scrollShift, top: flatSource.top, width: flatSource.width, height: flatSource.height };
      const focusScale = Math.min(destination.width / flatSource.width, destination.height / flatSource.height);
      const focusCentre = { x: destination.left + destination.width / 2, y: destination.top + destination.height / 2 };
      const scale = mobileFullscreenZoom ? Math.max(screen.width / flatSource.width, screen.height / flatSource.height) * 1.02 : focusScale;
      const centre = mobileFullscreenZoom ? { x: screen.left + screen.width / 2, y: screen.top + screen.height / 2 } : focusCentre;
      const pivot = { x: flatRoom.left + origin[0], y: flatRoom.top + origin[1] };
      const cameraPose = (scale, centre) => ({
        x: centre.x - pivot.x - (flatSource.left + flatSource.width / 2 - pivot.x) * scale,
        y: centre.y - pivot.y - (flatSource.top + flatSource.height / 2 - pivot.y) * scale,
        z: 0, scale, rotationX: 0, rotationY: 0, rotation: 0,
        transformPerspective: 1500, force3D: true,
      });
      const cameraRect = {
        left: centre.x - flatSource.width * scale / 2,
        top: centre.y - flatSource.height * scale / 2,
        width: flatSource.width * scale,
        height: flatSource.height * scale,
      };
      const cameraDuration = mobileFullscreenZoom ? 1.3 : 1.05;
      const cameraEnd = revealDuration + cameraDuration;
      const settleStart = cameraEnd;
      const settleDuration = mobileFullscreenZoom ? 1.35 : 0.3;
      gsap.set(artwork.current, { ...bounds(cameraRect), translate: 'none', autoAlpha: 0 });
      gsap.set(image.current, crop(cameraRect));
      gsap.set(leftPanel.current, { xPercent: -100, autoAlpha: 0 });
      gsap.set(rightPanel.current, { xPercent: 100, autoAlpha: 0 });
      gsap.set([backdrop.current, closeButton.current], { autoAlpha: 0 });
      if (mobileDetail) gsap.set(modal, { overflowY: 'hidden' });
      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: 'power2.inOut' },
        onReverseComplete: () => { if (mounted.current && closing.current) onClose(); },
      });
      cameraTimeline.current = timeline;
      if (mobileFullscreenZoom) mobileClose.current = () => context.add(() => {
        // Return directly from the detail pose, skipping the opening's full-screen zoom.
        gsap.set(modal, { overflowY: 'hidden' });
        gsap.set(room, cameraPose(focusScale, focusCentre));
        returnScroll.current = gsap.timeline({
          defaults: { ease: 'power2.inOut' },
          onComplete: () => { if (mounted.current) onClose(); },
        })
          .to(leftPanel.current, { xPercent: -100, autoAlpha: 0, duration: 0.45 }, 0)
          .to(rightPanel.current, { xPercent: 100, autoAlpha: 0, duration: 0.45 }, 0)
          .to(closeButton.current, { autoAlpha: 0, duration: 0.2 }, 0)
          .set(source, { opacity: 1 }, 0.25)
          .set(artwork.current, { autoAlpha: 0 }, 0.25)
          .to(backdrop.current, { autoAlpha: 0, duration: 0.45 }, 0.25)
          .to(room, { transform: originalRoomTransform, duration: 1.05 }, 0.25);
      });
      if (revealDuration) timeline.to(scroller, { scrollLeft: revealScroll, duration: revealDuration }, 0);
      timeline.to(room, {
        ...cameraPose(scale, centre), duration: cameraDuration,
      }, revealDuration)
        // At this point the wall is facing the viewer. Swap identical image bounds
        // before blurring so the selected painting remains sharp throughout.
        .set(source, { opacity: 0 }, cameraEnd)
        .set(artwork.current, { autoAlpha: 1 }, cameraEnd)
        .to(artwork.current, { ...bounds(destination), duration: settleDuration }, settleStart)
        .to(image.current, { ...fullImage(destination), duration: settleDuration }, settleStart)
        .to(backdrop.current, { autoAlpha: 1, duration: 0.35 }, cameraEnd)
        .to([leftPanel.current, rightPanel.current], { xPercent: 0, autoAlpha: 1, duration: 0.7 }, mobileFullscreenZoom ? settleStart + 0.95 : cameraEnd + 0.1)
        .to(closeButton.current, { autoAlpha: 1, duration: 0.2 }, mobileFullscreenZoom ? settleStart + 0.85 : cameraEnd + 0.25);
      if (mobileFullscreenZoom) timeline.to(room, { ...cameraPose(focusScale, focusCentre), duration: settleDuration }, settleStart);
      if (mobileDetail) timeline.set(modal, { overflowY: 'auto' });
      timeline.play(0);
    });
    return () => {
      mounted.current = false;
      returnScroll.current?.kill();
      context.revert();
      // Strict Mode also cleans up a trial setup before the animation starts.
      // Only a real close should retain the newly centered position.
      if (scroller?.isConnected) scroller.scrollLeft = closing.current ? retainedScroll : originalScroll;
      cameraTimeline.current = null;
      mobileClose.current = null;
      modal.close();
      source?.isConnected && source.focus({ preventScroll: true });
    };
  }, [selection]);
  const close = async () => {
    if (closing.current) return;
    closing.current = true;
    cameraTimeline.current?.pause();
    flushSync(() => { setIsClosing(true); setCursorVisible(false); setCurrentImage(0); });
    await image.current.decode().catch(() => {});
    if (!mounted.current) return;
    if (dialog.current.scrollTop > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      returnScroll.current = gsap.to(dialog.current, { scrollTop: 0, duration: 0.3, ease: 'power2.out' });
      await returnScroll.current;
      if (!mounted.current) return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !cameraTimeline.current || cameraTimeline.current.time() < 0.001) {
      onClose();
      return;
    }
    if (mobileClose.current) mobileClose.current();
    else {
      // Reverse only the camera/detail sequence; keep the edge-centering scroll.
      const timeline = cameraTimeline.current;
      const end = Math.min(timeline.time(), cameraStart.current);
      returnScroll.current = timeline.tweenTo(end, {
        duration: Math.max(0.01, (timeline.time() - end) / 1.15),
        ease: 'none',
        onComplete: () => { if (mounted.current) onClose(); },
      });
    }
  };
  return (
    <dialog className={`painting-detail ${isClosing ? 'painting-detail--closing' : ''}`} ref={dialog} aria-labelledby="detail-title" onCancel={(event) => { event.preventDefault(); close(); }}>
      <div ref={backdrop} className="detail-gallery-backdrop" aria-hidden="true" />
      <div ref={detailPanel} className="detail-panel">
        <div ref={leftPanel} className="detail-half detail-half--left">
        <aside className="detail-thumbnails" aria-label={t('additionalImages')}>
          {detailImages.map((src, index) => (
            <button key={src} className={`detail-thumbnail ${currentImage === index ? 'detail-thumbnail--active' : ''}`} aria-label={index === 0 ? t('showOriginal') : t('showAdditional', { number: index })} aria-pressed={currentImage === index}
              disabled={isClosing} onClick={() => chooseImage(index)} onPointerMove={pointCursor} onPointerLeave={() => setCursorVisible(false)}>
              <img src={src} {...responsiveImage(src, '(max-width: 800px) 19vw, 10vw')} loading="lazy" decoding="async" alt={index === 0 ? content.alt : t('additionalImage', { number: index })} />
            </button>
          ))}
        </aside>
        </div>
        <div ref={rightPanel} className="detail-half detail-half--right">
        <div className="detail-description"><p className="eyebrow">{t('painting')}</p><h2 id="detail-title">{content.title}</h2><p>{content.description}</p>{(content.technique || selection.painting.year) && <p className="artwork-metadata">{[content.technique, selection.painting.year].filter(Boolean).join(' · ')}</p>}{selection.painting.placeholder && <span>{t('detailPending')}</span>}</div>
        </div>
      </div>
      <button ref={closeButton} className="detail-close" onClick={close} autoFocus aria-label={t('closeDetail')}><span>{t('close')}</span><svg className="detail-close-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M5 5 27 27M27 5 5 27" /></svg></button>
      <div ref={artwork} className="detail-artwork" style={{ '--image-ratio': selection.ratio }}><img ref={image} className="detail-image" src={detailImages[currentImage]} alt={currentImage === 0 ? content.alt : t('additionalImage', { number: currentImage })} /></div>
      <div ref={cursor} className={`painting-cursor detail-cursor ${cursorVisible && !isClosing ? 'painting-cursor--visible' : ''}`} style={{ '--cursor-size': `${Math.max(94, t('enlarge').length * 8 + 32)}px` }} aria-hidden="true">{t('enlarge')}</div>
    </dialog>
  );
}

function Gallery({ active }) {
  const { language, t } = useLocale();
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const galleryPaintings = paintings.map(painting => ({ ...painting, ...localizedContent(painting, language) }));
  // Explicit mobile columns keep the two-row pattern identical across loop boundaries.
  const mobileRows = 2;
  let mobileColumn = 1;
  let mobileRow = 1;
  const mobileLayout = paintings.map(painting => {
    const span = painting.galleryRows === 2 ? 2 : 1;
    if (mobileRow + span > mobileRows + 1) { mobileColumn++; mobileRow = 1; }
    const placement = { column: mobileColumn, row: mobileRow, span };
    mobileRow += span;
    if (mobileRow > mobileRows) { mobileColumn++; mobileRow = 1; }
    return placement;
  });
  const mobileColumns = mobileColumn - (mobileRow === 1 ? 1 : 0);
  const doubleDesktopCycle = !mobile && paintings.length % 2 !== 0;
  const cycleLength = paintings.length * (doubleDesktopCycle ? 2 : 1);
  const copies = doubleDesktopCycle ? [0, 1, 2, 3, 4, 5] : [0, 1, 2];
  const accessibleCopy = doubleDesktopCycle ? 2 : 1;
  const activeRef = useRef(active);
  activeRef.current = active;
  const viewport = useRef(null);
  const titleCursor = useRef(null);
  const [hovered, setHovered] = useState(null);
  const cursorLabel = t('details');
  const [selection, setSelection] = useState(null);
  const detailOpen = useRef(false);
  const pendingOpen = useRef(0);
  useEffect(() => () => { pendingOpen.current++; }, []);
  const stopScroll = useRef(() => {});
  const openPainting = async (painting, copy, event) => {
    const source = event.currentTarget;
    source.focus({ preventScroll: true });
    const request = ++pendingOpen.current;
    stopScroll.current();
    // Keep the gallery image visible until the full-size detail is decoded.
    const fullSize = new Image();
    fullSize.src = painting.image;
    await fullSize.decode().catch(() => {});
    if (request !== pendingOpen.current || !source.isConnected) return;
    detailOpen.current = true;
    setHovered(null);
    const thumbnail = source.querySelector('img');
    const ratio = fullSize.naturalWidth / fullSize.naturalHeight || thumbnail.naturalWidth / thumbnail.naturalHeight || 1;
    const zoom = new DOMMatrixReadOnly(getComputedStyle(thumbnail).transform).a;
    setSelection({ painting, copy, ratio, zoom, source, rect: source.getBoundingClientRect() });
  };
  const closePainting = () => {
    detailOpen.current = false;
    setSelection(null);
  };
  const followCursor = (event) => {
    if (titleCursor.current) titleCursor.current.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
  };
  const scrollBy = useRef(() => {});
  const move = (direction) => {
    const element = viewport.current;
    scrollBy.current(direction * element.clientWidth * 0.85, mobile ? 160 : 420);
  };

  useEffect(() => {
    const element = viewport.current;
    const track = element.firstElementChild;
    let preloadObserver;
    const observeNearbyColumns = () => {
      preloadObserver?.disconnect();
      const styles = getComputedStyle(track);
      const columnWidth = parseFloat(styles.gridAutoColumns);
      const gap = parseFloat(styles.columnGap) || 0;
      const buffer = Math.ceil(2 * (columnWidth + gap));
      // Keep two off-screen columns on either side decoded ahead of scrolling.
      preloadObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const image = entry.target;
          image.loading = 'eager';
          image.decode().catch(() => {});
          preloadObserver.unobserve(image);
        }
      }, { root: element, rootMargin: `0px ${buffer}px`, threshold: 0 });
      track.querySelectorAll('img').forEach(image => preloadObserver.observe(image));
    };
    const resizeObserver = new ResizeObserver(observeNearbyColumns);
    resizeObserver.observe(element);
    observeNearbyColumns();
    return () => { resizeObserver.disconnect(); preloadObserver?.disconnect(); };
  }, [mobile]);

  useEffect(() => {
    const element = viewport.current;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let target = element.scrollLeft;
    let frame = null;
    let lastTime = null;
    let smoothing = mobile ? 45 : 180;
    const track = element.firstElementChild;
    let cycleWidth = 0;
    const room = element.parentElement;
    const floorTile = 400;
    let floorPhase = 0;
    const syncFloor = () => {
      const offset = ((element.scrollLeft + floorPhase) % floorTile + floorTile) % floorTile;
      room.style.setProperty('--floor-offset', `${-offset}px`);
    };
    const wrap = () => {
      if (!cycleWidth) return;
      // The camera owns scrollLeft until it returns to the original gallery view.
      if (detailOpen.current) { syncFloor(); return; }
      const current = element.scrollLeft;
      const wrapped = cycleWidth + ((current - cycleWidth) % cycleWidth + cycleWidth) % cycleWidth;
      if (Math.abs(wrapped - current) > 1) {
        element.scrollLeft = wrapped;
        // Repositioning the infinite track must not make the floor texture jump.
        floorPhase += current - element.scrollLeft;
        target += element.scrollLeft - current;
      }
      syncFloor();
    };
    const measure = () => {
      const phase = cycleWidth ? (element.scrollLeft - cycleWidth) / cycleWidth : null;
      const items = track.children;
      // Scroll distances stay in layout pixels, independent of the wall perspective.
      cycleWidth = items[cycleLength].offsetLeft - items[0].offsetLeft;
      const initialOffset = items[0].offsetWidth / 2;
      element.scrollLeft = cycleWidth + (phase === null ? initialOffset : cycleWidth * phase);
      target = element.scrollLeft;
      wrap();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(track);
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
      target = element.scrollLeft;
    };
    stopScroll.current = stop;
    const animate = (time) => {
      const elapsed = lastTime === null ? 16.67 : Math.min(time - lastTime, 64);
      lastTime = time;
      wrap();
      const distance = target - element.scrollLeft;
      if (motionPreference.matches || Math.abs(distance) < 0.5) {
        element.scrollLeft = target;
        wrap();
        stop();
        return;
      }
      // Time-based easing keeps the same feel on different refresh rates.
      element.scrollLeft += distance * (1 - Math.exp(-elapsed / smoothing));
      syncFloor();
      frame = requestAnimationFrame(animate);
    };
    scrollBy.current = (delta, duration = mobile ? 45 : 180) => {
      smoothing = duration;
      target = (frame === null ? element.scrollLeft : target) + delta;
      if (motionPreference.matches) {
        element.scrollLeft = target;
        wrap();
        stop();
      } else if (frame === null) {
        frame = requestAnimationFrame(animate);
      }
    };
    const onWheel = (event) => {
      if (!activeRef.current || detailOpen.current || event.ctrlKey) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1;
      scrollBy.current(delta * unit * (mobile ? 1 : 0.65));
    };
    let gesture = null;
    let suppressClick = false;
    const onTouchStart = (event) => {
      if (!mobile || event.pointerType !== 'touch') return;
      suppressClick = false;
      if (!event.isPrimary || !activeRef.current || detailOpen.current) {
        gesture = null;
        return;
      }
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null };
    };
    const onTouchMove = (event) => {
      if (!gesture || gesture.id !== event.pointerId || detailOpen.current) return;
      const dx = gesture.x - event.clientX;
      const dy = gesture.y - event.clientY;
      if (!gesture.axis) {
        if (Math.hypot(dx, dy) < 8) return;
        gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        element.setPointerCapture(event.pointerId);
      }
      suppressClick = true;
      scrollBy.current((gesture.axis === 'x' ? dx : dy) * 1.5, 45);
      gesture.x = event.clientX;
      gesture.y = event.clientY;
    };
    const endTouch = (event) => {
      if (gesture?.id === event.pointerId) gesture = null;
    };
    const preventDragClick = (event) => {
      if (!suppressClick || event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('pointerdown', stop);
    element.addEventListener('pointerdown', onTouchStart);
    element.addEventListener('pointermove', onTouchMove);
    element.addEventListener('pointerup', endTouch);
    element.addEventListener('pointercancel', endTouch);
    element.addEventListener('click', preventDragClick, true);
    element.addEventListener('scroll', wrap);
    return () => {
      stop();
      scrollBy.current = () => {};
      stopScroll.current = () => {};
      observer.disconnect();
      room.style.removeProperty('--floor-offset');
      window.removeEventListener('wheel', onWheel);
      element.removeEventListener('pointerdown', stop);
      element.removeEventListener('pointerdown', onTouchStart);
      element.removeEventListener('pointermove', onTouchMove);
      element.removeEventListener('pointerup', endTouch);
      element.removeEventListener('pointercancel', endTouch);
      element.removeEventListener('click', preventDragClick, true);
      element.removeEventListener('scroll', wrap);
    };
  }, [mobile]);

  return (
    <section className="gallery" aria-label={t('galleryLabel')}>
      <div className="gallery-room">
      <div className="gallery-viewport" ref={viewport} tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            move(event.key === 'ArrowRight' ? 1 : -1);
          }
        }}>
        <div className="gallery-track">
          {copies.flatMap((copy) => galleryPaintings.map((painting, paintingIndex) => (
            <figure className="gallery-item" data-wall-tall={painting.galleryRows === 2} key={`${copy}-${painting.id}`} aria-hidden={copy !== accessibleCopy ? true : undefined}
              style={mobile ? {
                gridColumn: copy * mobileColumns + mobileLayout[paintingIndex].column,
                gridRow: `${mobileLayout[paintingIndex].row} / span ${mobileLayout[paintingIndex].span}`,
              } : undefined}>
              <button className="painting-frame" data-selected={selection?.painting.id === painting.id && selection.copy === copy} data-hovered={hovered?.id === painting.id && !selection} aria-label={t('openPainting', { title: painting.title })} tabIndex={copy === accessibleCopy ? 0 : -1}
                // Native mouse focus would instantly reveal a clipped canvas before GSAP runs.
                onMouseDown={(event) => { if (event.button === 0) event.preventDefault(); }}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') { setHovered(painting); followCursor(event); }
                }}
                onPointerMove={(event) => { followCursor(event); if (event.pointerType === 'mouse' && !detailOpen.current) setHovered(painting); }} onPointerLeave={() => setHovered(null)}
                onClick={(event) => openPainting(painting, copy, event)}>
                <img src={painting.image} width={painting.width} height={painting.height} {...responsiveImage(painting.image, '(max-width: 600px) 72vw, 25vw')} loading={copy === accessibleCopy && paintingIndex < (mobile ? 4 : 10) ? 'eager' : 'lazy'} decoding="async" alt={painting.alt}
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    const ratio = image.naturalWidth / image.naturalHeight;
                    const figure = image.closest('.gallery-item');
                    figure.style.setProperty('--artwork-ratio', ratio);
                  }}
                  style={{ objectPosition: painting.position }} draggable="false" />
              </button>
              <figcaption><span>{painting.title}</span><span>{painting.placeholder ? t('placeholder') : painting.year}</span></figcaption>
            </figure>
          )))}
        </div>
      </div>
      </div>
      <div ref={titleCursor} className={`painting-cursor ${hovered ? 'painting-cursor--visible' : ''}`} aria-hidden="true"
        style={{
          '--cursor-size': `${Math.max(96, cursorLabel.length * 8 + 32)}px`,
        }}>{cursorLabel}</div>
      {selection && <PaintingDetail selection={selection} onClose={closePainting} />}
      <button className="gallery-edge gallery-edge--left" aria-label={t('moveLeft')} onClick={() => move(-1)}><span aria-hidden="true">←</span></button>
      <button className="gallery-edge gallery-edge--right" aria-label={t('moveRight')} onClick={() => move(1)}><span aria-hidden="true">→</span></button>
    </section>
  );
}

// Previous animated panel implementation is preserved below. To restore it,
// uncomment PagePanels and replace PageContent with PagePanels in App.
/*
function PagePanels({ page, introDone }) {
  const { language, t } = useLocale();
  const pages = navigationPages(t);
  const panels = useRef([]);
  const previousPage = useRef(page);
  const running = useRef([]);
  useLayoutEffect(() => {
    if (previousPage.current === page) {
      panels.current.forEach((panel, index) => { panel.style.transform = index === page ? 'translateY(0)' : 'translateY(120%)'; panel.style.visibility = index === page ? 'visible' : 'hidden'; });
      return;
    }
    const outgoing = previousPage.current;
    previousPage.current = page;
    const direction = page > outgoing ? 1 : -1;
    const parked = (side) => `translateY(${side * 120}%) rotateX(${-side * 16}deg) scale(.94)`;
    const bent = (side) => `translateY(${side * 18}%) rotateX(${-side * 9}deg) scale(.98)`;
    const resting = 'translateY(0) rotateX(0deg) scale(1)';
    const visible = panels.current.map(panel => panel.style.visibility !== 'hidden');
    // Read live positions before cancelling, so repeated menu clicks stay continuous.
    const positions = panels.current.map(panel => getComputedStyle(panel).transform);
    running.current.forEach(animation => animation.cancel());
    running.current = [];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const focusPage = () => panels.current[page].querySelector('h1, .gallery-viewport')?.focus({ preventScroll: true });
    if (reducedMotion) {
      panels.current.forEach((panel, index) => { panel.style.transform = index === page ? 'translateY(0)' : index < page ? 'translateY(-120%)' : 'translateY(120%)'; panel.style.visibility = index === page ? 'visible' : 'hidden'; });
      focusPage(); return;
    }
    panels.current.forEach((panel, index) => {
      if (index !== page && index !== outgoing) {
        panel.style.visibility = 'hidden';
        panel.style.transform = parked(index < page ? -1 : 1);
        return;
      }
      panel.style.visibility = index === page || index === outgoing ? 'visible' : 'hidden';
      const entering = index === page;
      const side = entering ? direction : -direction;
      const frames = entering
        ? [{ transform: visible[index] ? positions[index] : parked(side) }, { transform: bent(side), offset: .65 }, { transform: resting }]
        : [{ transform: positions[index] }, { transform: bent(side), offset: .35 }, { transform: parked(side) }];
      panel.style.transform = frames[frames.length - 1].transform;
      const animation = panel.animate(frames, { duration: 1800, easing: 'cubic-bezier(.45, 0, .3, 1)' });
      running.current.push(animation);
      animation.finished.then(() => {
        if (previousPage.current !== page) return;
        if (index === page) focusPage();
        else panel.style.visibility = 'hidden';
      }).catch(() => {});
    });
  }, [page]);
  useEffect(() => () => running.current.forEach(animation => animation.cancel()), []);
  return (
    <main className="page-stage" aria-label={t('portfolioLabel')}>
      {pages.map((item, index) => (
        <div key={item.id} id={item.id} ref={element => { panels.current[index] = element; }}
          className={`page-panel ${index === 0 ? 'page-panel--gallery' : 'page-panel--content'} ${page === index ? 'page-panel--active' : ''}`}
          inert={page !== index} aria-hidden={page !== index}>
          {index === 0 ? <Gallery active={introDone && page === 0} /> : (
            <section className={`content-section ${item.id === 'o-meni' ? 'about-section' : ''}`} aria-labelledby={`${item.id}-title`}>
              {item.id === 'o-meni' && <img className="about-portrait" src="/images/kaja_profil.webp" {...responsiveImage('/images/kaja_profil.webp', '(max-width: 700px) 360px, 42vw')} decoding="async" alt={t('portraitAlt')} width="1365" height="1365" />}
              <div className="content-text">
              <p className="eyebrow">{item.label}</p>
              <h1 id={`${item.id}-title`} className="signature" tabIndex={-1}>{item.title}</h1>
              {item.id === 'razstave' ? (
                <ul className="exhibition-list">
                  {exhibitions.map(exhibition => (
                    <li key={exhibition.id} className="exhibition-item">
                      <span className="exhibition-year">{exhibition.year}</span>
                      <div><h2>{localizedContent(exhibition, language).title}</h2><p>{localizedContent(exhibition, language).city ?? exhibition.city}</p></div>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p className="content-copy">{item.text}</p>
                  <span className="content-placeholder">{t('pending')}</span>
                </>
              )}
              </div>
            </section>
          )}
        </div>
      ))}
    </main>
  );
}

*/

const routeIds = ['domov', 'o-meni', 'razstave', 'kontakt'];
const pagePath = (language, page) => `/${language}/${page === 0 ? '' : `${routeIds[page]}/`}`;
const initialPage = () => {
  const slug = location.pathname.split('/').filter(Boolean).find(segment => routeIds.includes(segment));
  return Math.max(0, routeIds.indexOf(slug));
};

function AboutBiography({ text }) {
  return <div className="about-biography">{text.split(/\n\s*\n/).map((paragraph, index) => (
    <p key={index}>{paragraph.split(/(\*\*.*?\*\*)/g).map((part, partIndex) => part.startsWith('**') && part.endsWith('**')
      ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part)}</p>
  ))}</div>;
}

function PageContent({ page, introDone }) {
  const { language, t } = useLocale();
  const item = navigationPages(t)[page];
  const main = useRef(null);
  const previous = useRef(page);
  useLayoutEffect(() => {
    if (page === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = main.current;
    const mobile = window.matchMedia('(max-width: 600px)').matches;
    let observer;
    const context = gsap.context(() => {
      gsap.from(root.querySelectorAll('.content-text > .eyebrow, .content-text > h1'), {
        opacity: 0, y: mobile ? 10 : 18, duration: 0.65, stagger: 0.08, delay: 0.18, ease: 'power2.out',
      });
      const portrait = root.querySelector('.about-portrait');
      if (portrait) gsap.fromTo(portrait,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: mobile ? 0.75 : 1, delay: 0.18, ease: 'power3.inOut' });
      const paragraphs = root.querySelectorAll('.about-biography p');
      if (paragraphs.length) {
        gsap.set(paragraphs, { opacity: 0, y: mobile ? 10 : 18 });
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            context.add(() => gsap.to(entry.target, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }));
            observer.unobserve(entry.target);
          }
        }, { root, threshold: 0.12, rootMargin: '0px 0px -16px 0px' });
        paragraphs.forEach(paragraph => observer.observe(paragraph));
      }
      const entries = root.querySelectorAll('.exhibition-item, .content-copy, .content-placeholder');
      if (entries.length) gsap.from(entries, { opacity: 0, y: mobile ? 8 : 14, stagger: 0.1, duration: 0.65, delay: 0.3, ease: 'power2.out' });
    }, root);
    return () => { observer?.disconnect(); context.revert(); };
  }, [page, language]);
  useEffect(() => {
    if (previous.current !== page) {
      main.current.scrollTop = 0;
      main.current.querySelector('h1, .gallery-viewport')?.focus({ preventScroll: true });
      previous.current = page;
    }
  }, [page]);
  return (
    <main ref={main} className={`route-content ${page === 0 ? 'route-content--gallery' : `route-content--${item.id}`}`} aria-label={t('portfolioLabel')}>
      {page === 0 ? <Gallery active={introDone} /> : (
            <section className={`content-section ${item.id === 'o-meni' ? 'about-section' : item.id === 'razstave' ? 'exhibitions-section' : ''}`} aria-labelledby={`${item.id}-title`}>
              {item.id === 'o-meni' && (
                <div className="about-portrait-sticky">
                  <img className="about-portrait" src="/images/kaja_profil.webp" {...responsiveImage('/images/kaja_profil.webp', '(max-width: 700px) 360px, 42vw')} decoding="async" alt={t('portraitAlt')} width="1365" height="1365" />
                </div>
              )}
              <div className="content-text">
              <p className="eyebrow">{item.label}</p>
              <h1 id={`${item.id}-title`} className="signature" tabIndex={-1}>{item.title}</h1>
              {item.id === 'razstave' ? (
                <ul className="exhibition-list">
                  {exhibitions.map(exhibition => {
                    const content = localizedContent(exhibition, language);
                    return (
                      <li key={exhibition.id} className="exhibition-item">
                        <span className="exhibition-year">{exhibition.year}</span>
                        <div>
                          <h2>{content.title}</h2>
                          <p>{content.description}</p>
                          <p className="exhibition-venue">{content.venue}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <>
                  {item.id === 'o-meni' ? <AboutBiography text={item.text} /> : <>
                    <p className="content-copy">{item.text}</p>
                    <span className="content-placeholder">{t('pending')}</span>
                  </>}
                </>
              )}
              </div>
              {item.id === 'razstave' && (
                <div className="exhibitions-photo-sticky">
                  <img className="exhibitions-photo" src="/images/exhibit.jpg" alt={t('exhibitionsPhotoAlt')} loading="lazy" decoding="async" />
                </div>
              )}
            </section>
      )}
    </main>
  );
}

function LanguageDropdown({ language, onChange, label }) {
  const menuId = React.useId();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const options = useRef([]);
  const focusIndex = useRef(0);
  const names = { sl: 'Slovenščina', de: 'Deutsch', en: 'English' };
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current.focus();
  };
  const show = (index) => { focusIndex.current = index; setOpen(true); };
  useEffect(() => {
    if (!open) return;
    options.current[focusIndex.current]?.focus();
    const outside = (event) => { if (!root.current.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return (
    <div className="language-dropdown" ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}>
      <button className="language-trigger" ref={trigger} type="button" aria-label={`${label}: ${names[language]}`} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
        onClick={() => open ? close(true) : show(languages.indexOf(language))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); show(event.key === 'ArrowDown' ? 0 : languages.length - 1);
          } else if (event.key === 'Escape') close(true);
        }}>
        {language.toUpperCase()}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      {open && <div className="language-menu" id={menuId} role="menu" aria-label={label}
        onKeyDown={(event) => {
          const index = options.current.indexOf(document.activeElement);
          let next;
          if (event.key === 'ArrowDown') next = (index + 1) % languages.length;
          if (event.key === 'ArrowUp') next = (index - 1 + languages.length) % languages.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = languages.length - 1;
          if (next !== undefined) { event.preventDefault(); options.current[next].focus(); }
          if (event.key === 'Escape') { event.preventDefault(); close(true); }
        }}>
        {languages.map((code, index) => <button key={code} ref={element => { options.current[index] = element; }} type="button" role="menuitemradio" aria-checked={language === code} tabIndex={-1} lang={code}
          onClick={() => { onChange(code); close(true); }}>
          <span className="language-code">{code.toUpperCase()}</span><span>{names[code]}</span><span className="language-check" aria-hidden="true">{language === code ? '✓' : ''}</span>
        </button>)}
      </div>}
    </div>
  );
}

function IntroScreen({ header, onComplete }) {
  const logo = useRef(null);
  const left = useRef(null);
  const right = useRef(null);
  useEffect(() => {
    let cancelled = false;
    let readyTimer;
    let holdTimer;
    let animations = [];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = () => {
      if (cancelled) return;
      if (reducedMotion) { onComplete(); return; }
      const target = header.current?.querySelector('.header-logo');
      if (!target) { onComplete(); return; }
      const from = logo.current.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const x = to.left + to.width / 2 - from.left - from.width / 2;
      const y = to.top + to.height / 2 - from.top - from.height / 2;
      const options = { duration: 1400, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' };
      animations = [
        left.current.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }], options),
        right.current.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], options),
        logo.current.animate([
          { transform: 'translate(0, 0) scale(1)' },
          { transform: `translate(${x}px, ${y}px) scale(${to.width / from.width})` },
        ], options),
      ];
      Promise.all(animations.map(animation => animation.finished)).then(() => {
        if (!cancelled) onComplete();
      }).catch(() => {});
    };
    Promise.race([
      Promise.all([logo.current.decode().catch(() => {}), document.fonts.ready]),
      new Promise(resolve => { readyTimer = setTimeout(resolve, 2500); }),
    ]).then(() => {
      clearTimeout(readyTimer);
      if (!cancelled) holdTimer = setTimeout(start, reducedMotion ? 350 : 1600);
    });
    return () => {
      cancelled = true;
      clearTimeout(readyTimer);
      clearTimeout(holdTimer);
      animations.forEach(animation => animation.cancel());
    };
  }, [header, onComplete]);
  return (
    <div className="intro" aria-label="Kaja Cvetko">
      <div ref={left} className="intro-half intro-half--left" />
      <div ref={right} className="intro-half intro-half--right" />
      <img ref={logo} className="intro-logo" src="/kaja_logo.webp" alt="Kaja Cvetko" width="2172" height="724" />
    </div>
  );
}

function App() {
  const mobileMenu = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuLabels = {
    sl: { open: 'Odpri meni', close: 'Zapri meni' },
    de: { open: 'Menü öffnen', close: 'Menü schließen' },
    en: { open: 'Open menu', close: 'Close menu' },
  };
  const closeMenu = () => { mobileMenu.current?.close(); setMenuOpen(false); };
  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const onResize = () => { if (!query.matches) closeMenu(); };
    query.addEventListener('change', onResize);
    return () => query.removeEventListener('change', onResize);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const onPointer = event => { root.dataset.inputMethod = event.pointerType === 'touch' ? 'touch' : 'pointer'; };
    const onKey = event => {
      if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
        root.dataset.inputMethod = 'keyboard';
      }
    };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
      delete root.dataset.inputMethod;
    };
  }, []);
  const header = useRef(null);
  useLayoutEffect(() => {
    const element = header.current;
    const measure = () => element.parentElement.style.setProperty('--header-height', `${element.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [language, setLanguage] = useState(initialLanguage);
  const [page, setPage] = useState(initialPage);
  const transitionLayer = useRef(null);
  const routeAnimation = useRef(null);
  const pendingRoute = useRef(null);
  const shownRoute = useRef({ page, language });
  shownRoute.current = { page, language };
  const transitionTo = React.useCallback(function transitionTo(next) {
    const commit = target => {
      if (target.push && location.pathname !== pagePath(target.language, target.page)) {
        window.history.pushState(null, '', `${pagePath(target.language, target.page)}${location.search}`);
      }
      flushSync(() => { setLanguage(target.language); setPage(target.page); });
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      routeAnimation.current?.kill();
      routeAnimation.current = null;
      pendingRoute.current = null;
      gsap.set(transitionLayer.current, { x: 0, y: 0, yPercent: 100, autoAlpha: 0 });
      commit(next);
      return;
    }
    if (routeAnimation.current) { pendingRoute.current = next; return; }
    if (next.page === shownRoute.current.page && next.language === shownRoute.current.language) return;
    pendingRoute.current = next;
    const layer = transitionLayer.current;
    routeAnimation.current = gsap.timeline({
      onComplete: () => {
        routeAnimation.current = null;
        const queued = pendingRoute.current;
        pendingRoute.current = null;
        if (queued) transitionTo(queued);
      },
    })
      .set(layer, { x: 0, y: 0, yPercent: 100, autoAlpha: 1 })
      .to(layer, { yPercent: 0, duration: 1.1, ease: 'power3.inOut' })
      .call(() => {
        const target = pendingRoute.current;
        pendingRoute.current = null;
        if (target) commit(target);
      })
      .to(layer, { yPercent: -100, duration: 1.3, ease: 'power3.inOut' })
      .set(layer, { autoAlpha: 0, yPercent: 100 });
  }, []);
  useEffect(() => () => { routeAnimation.current?.kill(); }, []);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  useEffect(() => { setHeaderScrolled(false); }, [page]);
  const t = translator(language);
  const pages = navigationPages(t);
  const changeLanguage = (nextLanguage) => {
    if (!languages.includes(nextLanguage)) return;
    transitionTo({ page, language: nextLanguage, push: true });
  };
  useEffect(() => {
    const syncLanguage = () => transitionTo({ page: initialPage(), language: initialLanguage(), push: false });
    window.addEventListener('popstate', syncLanguage);
    return () => window.removeEventListener('popstate', syncLanguage);
  }, [transitionTo]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = page === 0 ? translator(language)('pageTitle') : `${navigationPages(translator(language))[page].title} — Kaja Cvetko`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', translator(language)('metaDescription'));
    try { localStorage.setItem('kaja-language', language); } catch { /* Optional persistence. */ }
    if (!languages.includes(location.pathname.split('/')[1])) {
      window.history.replaceState(null, '', `${pagePath(language, page)}${location.search}`);
    }
  }, [language, page]);
  const [intro, setIntro] = useState(() => initialPage() === 0 ? 'visible' : 'done');
  const finishIntro = React.useCallback(() => setIntro('done'), []);
  const navigate = (index, event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (index === page && !routeAnimation.current) return;
    transitionTo({ page: index, language, push: true });
  };

  return (
    <LocaleContext.Provider value={{ language, t }}>
      <div className={`home ${intro !== 'done' ? 'home--intro' : ''}`} inert={intro !== 'done'}
        onScrollCapture={(event) => {
          const scroller = event.target;
          if (scroller instanceof HTMLElement && scroller.matches('.gallery-viewport, .route-content')) {
            setHeaderScrolled(scroller.scrollTop > 8 || scroller.scrollLeft > 8);
          }
        }}>
        <header ref={header} className={`site-header ${headerScrolled ? 'site-header--scrolled' : ''}`}>
          <a
            className="brand"
            href={pagePath(language, 0)}
            onClick={(event) => navigate(0, event)}
            aria-label={t('homeLabel')}
          >
            <img className="header-logo" src="/kaja_logo.webp" alt="Kaja Cvetko" width="2172" height="724" />
          </a>
          <nav className="header-nav header-nav--right" aria-label={t('navigation')}>
            {pages.map((item, index) => <a key={item.id} href={pagePath(language, index)} onClick={(event) => navigate(index, event)} aria-current={page === index ? 'page' : undefined}>{item.title}</a>)}
            <LanguageDropdown language={language} onChange={changeLanguage} label={t('language')} />
          </nav>
          <button className="mobile-menu-toggle" type="button" aria-label={menuLabels[language].open} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => { mobileMenu.current.showModal(); setMenuOpen(true); }}>
            <span /><span /><span />
          </button>
        </header>
        <dialog ref={mobileMenu} id="mobile-navigation" className="mobile-navigation" aria-label={t('navigation')} onClose={() => setMenuOpen(false)} onClick={event => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeMenu();
        }}>
          <button className="mobile-menu-close" type="button" aria-label={menuLabels[language].close} onClick={closeMenu}>×</button>
          <nav className="mobile-menu-links" aria-label={t('navigation')}>
            {pages.map((item, index) => <a key={item.id} href={pagePath(language, index)} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) closeMenu(); navigate(index, event); }} aria-current={page === index ? 'page' : undefined}>{item.title}</a>)}
          </nav>
          <LanguageDropdown language={language} onChange={code => { closeMenu(); changeLanguage(code); }} label={t('language')} />
        </dialog>
        <PageContent page={page} introDone={intro === 'done'} />
      </div>
      <div ref={transitionLayer} className="page-transition" aria-hidden="true" />
      {intro !== 'done' && <IntroScreen header={header} onComplete={finishIntro} />}
    </LocaleContext.Provider>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
