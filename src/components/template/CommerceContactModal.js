"use client";

export default function CommerceContactModal({ open, onClose, contactHref = "#contact" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-zinc-900">
          Cart & checkout
        </h3>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Full shopping cart and checkout are not included on the sample site. Contact us and we can
          enable online ordering for your business.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Close
          </button>
          <a
            href={contactHref}
            onClick={onClose}
            className="rounded-full bg-[#0b3d91] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Contact us
          </a>
        </div>
      </div>
    </div>
  );
}
