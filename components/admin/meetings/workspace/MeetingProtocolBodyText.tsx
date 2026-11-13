import { redactConferencingSecretsInText } from "@/lib/meetings/meeting-protocol-location";

type Props = {
  text: string;
  className?: string;
};

/**
 * Preserves paragraphs and line breaks; redacts conferencing secrets in URLs.
 */
export default function MeetingProtocolBodyText({ text, className }: Props) {
  const safe = redactConferencingSecretsInText(text);
  const paragraphs = safe.split(/\n{2,}/);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph.split(/\n/);
        return (
          <p key={index} className={index > 0 ? "mt-3 whitespace-pre-wrap" : "whitespace-pre-wrap"}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
