import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useTutorialStore, TUTORIAL_STEP_COUNT } from '@renderer/features/tutorial/tutorialStore';
import { TUTORIAL_STEPS } from '@renderer/features/tutorial/tutorialSteps';
import { useAppStore } from '@renderer/store/appStore';

const CARD_W = 340;
const GAP = 14;
const RING_PAD = 6;

function computeCardPosition(
  side: string,
  targetRect: DOMRect | null,
): React.CSSProperties {
  if (side === 'center' || !targetRect) {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  if (side === 'bottom-center') {
    return { position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)' };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (side === 'bottom') {
    const left = Math.max(12, Math.min(
      targetRect.left + targetRect.width / 2 - CARD_W / 2,
      vw - CARD_W - 12,
    ));
    const top = Math.min(targetRect.bottom + GAP, vh - 220);
    return { position: 'fixed', top, left };
  }

  if (side === 'top') {
    const left = Math.max(12, Math.min(
      targetRect.left + targetRect.width / 2 - CARD_W / 2,
      vw - CARD_W - 12,
    ));
    return { position: 'fixed', bottom: vh - targetRect.top + GAP, left };
  }

  if (side === 'right') {
    const top = Math.max(12, Math.min(targetRect.top + targetRect.height / 2 - 80, vh - 220));
    return { position: 'fixed', top, left: Math.min(targetRect.right + GAP, vw - CARD_W - 12) };
  }

  if (side === 'left') {
    const top = Math.max(12, Math.min(targetRect.top + targetRect.height / 2 - 80, vh - 220));
    return { position: 'fixed', top, right: window.innerWidth - targetRect.left + GAP };
  }

  return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
}

export function TutorialOverlay() {
  const { active, step, advance, skip, spotlightSuppressed } = useTutorialStore();
  const stepDef = TUTORIAL_STEPS[step];

  const setNodeCreationModal = useAppStore((s) => s.setNodeCreationModal);
  const createTutorialProject = useAppStore((s) => s.createTutorialProject);

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [canForceAdvance, setCanForceAdvance] = useState(false);
  const stepEnteredAtRef = useRef(Date.now());
  const advanceTimerRef = useRef<number | undefined>(undefined);

  // Track target element bounding rect
  useEffect(() => {
    if (!active) {
      setTargetRect(null);
      return;
    }

    const update = () => {
      if (stepDef?.targetId) {
        const el = document.querySelector(`[data-tutorial-id="${stepDef.targetId}"]`);
        setTargetRect(el ? el.getBoundingClientRect() : null);
      } else {
        setTargetRect(null);
      }
    };

    update();
    const interval = setInterval(update, 150);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', update);
    };
  }, [active, step, stepDef?.targetId]);

  // Run onEnter side-effect when step changes
  useEffect(() => {
    if (!active || !stepDef) return;
    stepEnteredAtRef.current = Date.now();
    stepDef.onEnter?.({ setNodeCreationModal, createTutorialProject });
  }, [active, step]); // store actions are stable

  // Auto-advance on completion check
  useEffect(() => {
    if (!active || !stepDef?.completionCheck) return;
    const completionCheck = stepDef.completionCheck;

    const check = () => {
      if (Date.now() - stepEnteredAtRef.current < 500) return;
      if (completionCheck(useAppStore.getState())) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = window.setTimeout(advance, 350);
      }
    };

    const interval = setInterval(check, 200);
    return () => {
      clearInterval(interval);
      window.clearTimeout(advanceTimerRef.current);
    };
  }, [active, step, advance]);

  // Force-advance fallback for stuck completion checks
  useEffect(() => {
    if (!active || !stepDef?.completionCheck) {
      setCanForceAdvance(false);
      return;
    }
    setCanForceAdvance(false);
    const timer = window.setTimeout(() => setCanForceAdvance(true), 6000);
    return () => window.clearTimeout(timer);
  }, [active, step, stepDef?.completionCheck]);

  if (!active || !stepDef) return null;
  if (spotlightSuppressed) return null;

  const hasSpotlight = !!stepDef.targetId && !!targetRect;
  const progress = ((step + 1) / TUTORIAL_STEP_COUNT) * 100;
  const cardStyle = computeCardPosition(stepDef.tooltipSide, hasSpotlight ? targetRect : null);

  const r = targetRect;

  return (
    <>
      {/* Spotlight strips — only when there's a located target */}
      {hasSpotlight && r && (
        <>
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[145]"
            style={{ height: Math.max(0, r.top - RING_PAD), background: 'rgba(2,6,23,0.72)' }}
          />
          <div
            className="pointer-events-none fixed inset-x-0 z-[145]"
            style={{ top: r.bottom + RING_PAD, bottom: 0, background: 'rgba(2,6,23,0.72)' }}
          />
          <div
            className="pointer-events-none fixed z-[145]"
            style={{
              top: r.top - RING_PAD,
              left: 0,
              width: Math.max(0, r.left - RING_PAD),
              height: r.height + RING_PAD * 2,
              background: 'rgba(2,6,23,0.72)',
            }}
          />
          <div
            className="pointer-events-none fixed z-[145]"
            style={{
              top: r.top - RING_PAD,
              left: r.right + RING_PAD,
              right: 0,
              height: r.height + RING_PAD * 2,
              background: 'rgba(2,6,23,0.72)',
            }}
          />
          {/* Glow ring */}
          <div
            className="pointer-events-none fixed z-[146] rounded-xl tutorial-ring"
            style={{
              top: r.top - RING_PAD,
              left: r.left - RING_PAD,
              width: r.width + RING_PAD * 2,
              height: r.height + RING_PAD * 2,
              border: '2px solid rgba(95,212,255,0.65)',
              boxShadow: '0 0 20px rgba(95,212,255,0.2), inset 0 0 12px rgba(95,212,255,0.05)',
            }}
          />
        </>
      )}

      {/* Soft backdrop for center-card steps */}
      {!hasSpotlight && stepDef.tooltipSide === 'center' && (
        <div
          className="pointer-events-none fixed inset-0 z-[145]"
          style={{ background: 'rgba(2,6,23,0.5)' }}
        />
      )}

      {/* Tutorial card */}
      <div
        className="z-[160] w-[340px] overflow-hidden rounded-2xl"
        style={{
          ...cardStyle,
          background: 'rgba(8,13,28,0.98)',
          border: '1px solid rgba(71,85,105,0.4)',
          boxShadow: '0 24px 64px rgba(2,6,23,0.65), 0 0 0 1px rgba(95,212,255,0.04)',
        }}
      >
        {/* Progress bar */}
        <div className="relative h-[3px]" style={{ background: 'rgba(71,85,105,0.25)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-sky))',
            }}
          />
        </div>

        <div className="p-5">
          {/* Step counter */}
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: 'var(--accent-sky)' }}
          >
            Step {step + 1} of {TUTORIAL_STEP_COUNT}
          </p>

          <h3 className="mb-2 text-[15px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {stepDef.title}
          </h3>

          <p className="text-[13px] leading-[1.65]" style={{ color: 'var(--text-muted)' }}>
            {stepDef.body}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={skip}
              className="text-[12px] transition-colors hover:opacity-80"
              style={{ color: 'rgba(98,112,141,0.55)' }}
            >
              Skip tutorial
            </button>

            {!stepDef.completionCheck ? (
              <button
                onClick={advance}
                className="rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all hover:brightness-110"
                style={{
                  background: 'linear-gradient(135deg, rgba(69,214,168,0.14), rgba(95,212,255,0.14))',
                  border: '1px solid rgba(95,212,255,0.3)',
                  color: 'var(--accent-sky)',
                }}
              >
                {stepDef.nextLabel ?? 'Next →'}
              </button>
            ) : canForceAdvance ? (
              <button
                onClick={advance}
                className="rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all hover:brightness-110"
                style={{
                  background: 'rgba(95,212,255,0.08)',
                  border: '1px solid rgba(95,212,255,0.2)',
                  color: 'rgba(95,212,255,0.65)',
                }}
              >
                Continue anyway →
              </button>
            ) : (
              <span
                className="flex items-center gap-1.5 text-[12px]"
                style={{ color: 'rgba(98,112,141,0.5)' }}
              >
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500/60" />
                Waiting for action…
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
