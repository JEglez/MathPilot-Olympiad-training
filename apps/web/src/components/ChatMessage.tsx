import styles from "./ChatMessage.module.css";

interface Props {
  readonly content: string;
}

export function ChatMessage({ content }: Props) {
  return (
    <div className={styles.message}>
      <div className={`${styles.bubble} ${styles.user}`}>
        <p className={styles.userText}>{content}</p>
      </div>
    </div>
  );
}
