type Props = {
  message: string;
  className?: string;
};

export default function ClubDevelopmentFormError({ message, className = "" }: Props) {
  return (
    <p
      className={`rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900 ${className}`.trim()}
      role="alert"
    >
      {message}
    </p>
  );
}