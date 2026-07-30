"use client";

export default function MessageThread({ messages = [], title }) {
  return (
    <div className="flex h-full flex-col">
      {title && (
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        </div>
      )}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const mine = msg.sender === "guest" || msg.sender === "owner";
          return (
            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.system
                    ? "bg-amber-50 text-amber-950 ring-1 ring-amber-200"
                    : mine
                      ? "bg-[#0b3d91] text-white"
                      : "bg-zinc-100 text-zinc-900"
                }`}
              >
                <p className="mb-1 text-[11px] uppercase tracking-wide opacity-70">
                  {msg.sender}
                  {msg.system ? " · invite" : ""}
                </p>
                {msg.body && <p className="whitespace-pre-wrap leading-6">{msg.body}</p>}
                {msg.images?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.images.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Attachment" className="h-24 w-24 rounded-lg object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
