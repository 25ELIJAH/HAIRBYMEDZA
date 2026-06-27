import Icon from "./Icon";

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
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 font-semibold text-white shadow-soft transition hover:brightness-105 sm:bottom-6 sm:right-6"
    >
      <Icon name="whatsapp" size={22} />
      <span className="hidden sm:inline">Chat with me</span>
    </a>
  );
}
