"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./page.module.css";

type FaqItem = {
  q: string;
  a: string;
};

export default function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={styles.faqGrid}>
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className={styles.faqItem}
            data-open={isOpen ? "true" : "false"}
          >
            <button
              className={styles.faqQuestion}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              id={`faq-${i}`}
            >
              {faq.q}
              <ChevronDown size={18} className={styles.faqChevron} />
            </button>
            <div
              className={isOpen ? styles.faqAnswer : styles.faqAnswerHidden}
              role="region"
              aria-labelledby={`faq-${i}`}
            >
              {faq.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
