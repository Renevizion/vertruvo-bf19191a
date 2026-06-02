export const TypingIndicator = () => {
  return (
    <div className="flex justify-start mb-4 animate-in fade-in">
      <div className="bg-[hsl(var(--chat-ai-bg))] text-[hsl(var(--chat-ai-fg))] rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-60" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
