import type { ReactNode } from 'react'
import type { Tone } from './ui'
import { ActSlide, RevealSlide, ShiftSlide } from './slides/Opening'
import { ApproveSection, BreakSection } from './slides/Sections'
import { CauseSlide, NewsWall, RazorpaySlide } from './slides/Incidents'
import { Architecture, DifferenceSlide, TwoEngines } from './slides/Engines'
import { PipelineSlide } from './slides/Pipeline'
import { RulesSlide } from './slides/Rules'
import { OffVsOnSlide } from './slides/Stage'
import LiveSlide from './slides/Live'

export interface SlideDef {
  id: string
  /** Number of builds; the slide renders step 0 … steps − 1. Builds autoplay on entry. */
  steps: number
  /** Milliseconds between autoplayed steps (default 550). */
  autoplayMs?: number
  tone: Tone
  render: (step: number) => ReactNode
  /** Short name for the overview grid and screen readers. */
  title?: string
  /** Live/interactive slide: clicks never advance the deck. */
  interactive?: boolean
  /** Hide the "PRAHARI" footer. */
  footer?: boolean
}

export const SLIDES: SlideDef[] = [
  { id: 'shift', title: 'Companies move to agents', steps: 2, autoplayMs: 2200, tone: 'paper', footer: false, render: (s) => <ShiftSlide step={s} /> },
  { id: 'act', title: 'Agents act', steps: 3, autoplayMs: 1300, tone: 'paper', footer: false, render: (s) => <ActSlide step={s} /> },
  { id: 'title', title: 'Prahari', steps: 2, autoplayMs: 2600, tone: 'ink', footer: false, render: (s) => <RevealSlide step={s} /> },
  { id: 'news', title: 'Already going wrong', steps: 1, tone: 'paper', render: () => <NewsWall /> },
  { id: 'razorpay', title: 'Razorpay up close', steps: 1, tone: 'paper', render: () => <RazorpaySlide /> },
  { id: 'cause', title: 'Root cause, three failures', steps: 1, tone: 'paper', render: () => <CauseSlide /> },
  { id: 'approve', title: '– 02 Only Prahari approves', steps: 2, autoplayMs: 1100, tone: 'leaf', render: (s) => <ApproveSection step={s} /> },
  { id: 'difference', title: 'Classifiers vs Prahari', steps: 1, tone: 'paper', render: () => <DifferenceSlide /> },
  { id: 'engines', title: 'Two engines', steps: 4, autoplayMs: 650, tone: 'paper', render: (s) => <TwoEngines step={s} /> },
  { id: 'pipeline', title: 'How it works', steps: 6, autoplayMs: 850, tone: 'paper', render: (s) => <PipelineSlide step={s} /> },
  { id: 'architecture', title: 'Under the hood', steps: 1, tone: 'paper', footer: false, render: () => <Architecture /> },
  { id: 'rules', title: 'Rules in plain English', steps: 1, tone: 'paper', render: () => <RulesSlide /> },
  { id: 'off-vs-on', title: 'Off vs On', steps: 1, tone: 'paper', footer: false, render: () => <OffVsOnSlide /> },
  { id: 'break', title: '– 03 Let’s try to break it', steps: 1, tone: 'sky', footer: false, render: () => <BreakSection /> },
  { id: 'live-food', title: 'Live · Swiggy', steps: 1, tone: 'paper', interactive: true, footer: false, render: () => <LiveSlide kind="food" /> },
  { id: 'live-bank', title: 'Live · HDFC Bank', steps: 1, tone: 'paper', interactive: true, footer: false, render: () => <LiveSlide kind="bank" /> },
  { id: 'live-hiring', title: 'Live · Hiring', steps: 1, tone: 'paper', interactive: true, footer: false, render: () => <LiveSlide kind="hiring" /> },
  { id: 'live-policies', title: 'Live · Policies', steps: 1, tone: 'paper', interactive: true, footer: false, render: () => <LiveSlide kind="policies" /> },
]
