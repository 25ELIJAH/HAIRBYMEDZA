// Floating WhatsApp contact button. The number comes from the database
// (settings), never hard coded in the source.
export default function WhatsAppButton({
  phone,
  message = "Hello Magdalene, I am reaching out from your Magdalene Medza booking website. I would like to ask about a braiding appointment.",
}: {
  phone: string;
  message?: string;
}) {
  const number = phone.replace(/[^0-9]/g, "");
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-charcoal shadow-soft transition hover:border-gray-300 sm:bottom-6 sm:right-6"
    >
      WhatsApp
    </a>
  );
}
