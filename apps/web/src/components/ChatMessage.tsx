interface Props {
  readonly content: string;
}

export function ChatMessage({ content }: Props) {
  return (
    <div className="flex justify-end">
      <div style={{ maxWidth: "80%" }}>
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{
            background: "#0F172A",
            color: "#fff",
            borderBottomRightRadius: 4,
          }}
        >
          <p className="m-0">{content}</p>
        </div>
      </div>
    </div>
  );
}
