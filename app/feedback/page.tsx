"use client";

import { useState } from "react";
import { Send, MessageSquarePlus } from "lucide-react";
import styles from "./page.module.css";

export default function FeedbackPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get("type") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    setStatus("sending");

    try {
      const payload = {
        source: "Bodee Books Main Site",
        type,
        name: name || "Guest",
        email,
        message,
        url: window.location.href,
        userAgent: navigator.userAgent.slice(0, 200),
      };

      const res = await fetch("/api/feedback/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to send feedback");
      }

      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("Could not connect to the server. Please try again later.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <MessageSquarePlus size={48} color="var(--green)" style={{ marginBottom: "1rem" }} />
        <h1 className={styles.title}>Send Feedback</h1>
        <p className={styles.subtitle}>Spotted a bug? Have a suggestion? We want to hear from you!</p>
      </div>

      {status === "success" && (
        <div className={`${styles.status} ${styles.statusSuccess}`}>
          ✅ Thank you! Your feedback has been received. We read every message!
        </div>
      )}

      {status === "error" && (
        <div className={`${styles.status} ${styles.statusError}`}>
          ❌ {errorMessage}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="type" className={styles.label}>Type of Feedback</label>
          <select id="type" name="type" className={styles.select} required>
            <option value="Bug Report">Bug Report</option>
            <option value="Feature Request">Feature Request</option>
            <option value="General Feedback">General Feedback</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>Your Name <span style={{ color: "var(--muted)", fontWeight: "normal" }}>(optional)</span></label>
          <input type="text" id="name" name="name" className={styles.input} placeholder="e.g. Sarah" />
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email <span style={{ color: "var(--muted)", fontWeight: "normal" }}>(optional)</span></label>
          <input type="email" id="email" name="email" className={styles.input} placeholder="you@example.com" />
        </div>

        <div className={styles.field}>
          <label htmlFor="message" className={styles.label}>Message *</label>
          <textarea 
            id="message" 
            name="message" 
            className={styles.textarea} 
            required 
            placeholder="Describe the issue or idea in detail..."
          ></textarea>
        </div>

        <button 
          type="submit" 
          className={styles.submitBtn} 
          disabled={status === "sending"}
        >
          <Send size={18} />
          {status === "sending" ? "Sending..." : "Send Feedback"}
        </button>
      </form>
    </div>
  );
}
