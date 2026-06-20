import { useEffect, useRef, useState } from "react";
import { ChevronDown, Cog, Send, Sparkles } from "lucide-react";
import { AgentStep, ChatMessage } from "../lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  steps: AgentStep[];
  draft: string;
  isThinking: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onUseExample: (value: string) => void;
}

const examples = [
  "我在望京上班，预算 6500，希望一居整租，离地铁近，不要转租和隔断。",
  "预算降到 6000，优先整租，可以远一点但地铁 800 米内。",
  "我想在张江附近租一居，预算 6000，最好民水民电。",
];

export function ChatPanel({ messages, steps, draft, isThinking, onDraftChange, onSend, onUseExample }: ChatPanelProps) {
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [composerHeight, setComposerHeight] = useState(116);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const shouldShowTimeline = isThinking || isTimelineExpanded;
  const hasAgentSteps = steps.length > 0 || isThinking;
  const lastDoneStep = [...steps].reverse().find((step) => step.status === "done");

  useEffect(() => {
    if (!isThinking) setIsTimelineExpanded(false);
  }, [isThinking]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    const updateComposerHeight = () => {
      setComposerHeight(Math.ceil(composer.getBoundingClientRect().height));
    };

    updateComposerHeight();
    const observer = new ResizeObserver(updateComposerHeight);
    observer.observe(composer);
    window.addEventListener("resize", updateComposerHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateComposerHeight);
    };
  }, []);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
  }, [messages.length, steps.length, isThinking, isTimelineExpanded, composerHeight]);

  return (
    <section className="thread-card chat-panel" style={{ "--composer-safe-space": `${composerHeight + 36}px` } as React.CSSProperties}>
      <div className="thread-intro">
        <span>Mock Agent</span>
        <h2>说出你的租房条件</h2>
      </div>

      <div className="message-list">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <Sparkles size={22} />
            <h3>输入租房需求</h3>
            <div className="example-list">
              {examples.map((example) => (
                <button key={example} type="button" onClick={() => onUseExample(example)}>
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <span>{message.role === "user" ? "你" : "租房 Agent"}</span>
              <p>{message.content}</p>
            </article>
          ))
        )}
      </div>

      {hasAgentSteps && (
        <div className="agent-steps">
          {!isThinking && (
            <button className="timeline-summary" type="button" onClick={() => setIsTimelineExpanded((value) => !value)}>
              <span className="timeline-node done" />
              <span className="timeline-summary-text">
                <strong>已完成 {steps.length} 个步骤</strong>
                <span>{lastDoneStep ? lastDoneStep.title : "需求已更新"}</span>
              </span>
              <ChevronDown className={isTimelineExpanded ? "timeline-chevron open" : "timeline-chevron"} size={15} />
            </button>
          )}

          {shouldShowTimeline && (
            <div className="timeline-detail">
              {steps.map((step) => (
                <div className="step" key={`${step.title}-${step.detail}`}>
                  <span className={step.status === "done" ? "timeline-node done" : "timeline-node running"}>
                    {step.status === "running" && <Cog size={13} />}
                  </span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="step">
                  <span className="timeline-node running">
                    <Cog size={13} />
                  </span>
                  <div>
                    <strong>处理中</strong>
                    <p>正在理解需求并刷新候选房源。</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="chat-scroll-anchor" ref={scrollAnchorRef} />

      <div className="composer codex-composer" ref={composerRef}>
        <textarea
          value={draft}
          placeholder="例如：我在望京上班，预算 6500，一居整租，地铁 800 米内..."
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.altKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <button className="primary-button send-button" disabled={isThinking} type="button" onClick={onSend} aria-label={isThinking ? "处理中" : "发送"}>
          <Send size={18} />
        </button>
      </div>
    </section>
  );
}
