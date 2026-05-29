"use client";

import { useState } from "react";
import { Copy, Check, Code, FileCode, BookOpen } from "lucide-react";
import styles from "./GrepToolsClient.module.css";

interface CodeEntry {
  id: string;
  label?: string;
  code: string;
}

interface Tool {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  codes: CodeEntry[];
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button className={`${styles.copyBtn} ${copied ? styles.copied : ""}`} onClick={handleCopy}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ entry }: { entry: CodeEntry }) {
  return (
    <div className={styles.codeBlock}>
      {entry.label && <div className={styles.codeLabel}>{entry.label}</div>}
      <div className={styles.codeInner}>
        <pre id={entry.id}><code>{entry.code}</code></pre>
        <CopyButton code={entry.code} />
      </div>
    </div>
  );
}

const tools: Tool[] = [
  {
    id: "sentences-lowercase",
    icon: <FileCode size={18} />,
    title: "1. Find Sentences Not Starting with a CAPITAL",
    description: <p>This expression finds sentences that begin with a lowercase letter and end with a period. Great for catching mis-formatted paragraphs.</p>,
    codes: [{ id: "grep1", code: "^[a-z].+?\\." }],
  },
  {
    id: "italics",
    icon: <FileCode size={18} />,
    title: "2. Italics in Adobe InDesign",
    description: (
      <>
        <p>Find text wrapped in underscores or asterisks. When you replace with <code>$1</code>, it removes the markers so you can then apply italics using your hotkey (e.g., <code>N + H + F1</code>).</p>
      </>
    ),
    codes: [
      { id: "italics-1", label: "Find What (underscores):", code: "_([A-Za-z ]+)_" },
      { id: "italics-2", label: "Find What (any content):", code: "_([^_]+)_" },
      { id: "italics-replace", label: "Change To:", code: "$1" },
    ],
  },
  {
    id: "wrong-linebreaks",
    icon: <FileCode size={18} />,
    title: "3. Fixing Wrong Line Breaks",
    description: (
      <p>
        Removes one or more incorrect paragraph breaks that appear before a sentence beginning with a lowercase letter. Collapses the line(s) so the sentence flows correctly.
      </p>
    ),
    codes: [
      { id: "linebreak-find", label: "Find What:", code: "\\r+([a-z].+?\\.)" },
      { id: "linebreak-replace", label: "Change To:", code: "$1" },
      { id: "linebreak-space", label: "Change To (with space):", code: " $1" },
    ],
  },
  {
    id: "quotes",
    icon: <FileCode size={18} />,
    title: "4. Find Text in Quotes",
    description: <p>Finds any text surrounded by standard double quotation marks.</p>,
    codes: [{ id: "grep-quotes", code: '"([^"]+)"' }],
  },
  {
    id: "asterisk-single",
    icon: <FileCode size={18} />,
    title: "5. Find Text Enclosed in Single Asterisks",
    description: <p>Matches text wrapped by a single asterisk on each side — useful for finding bold or emphasis markers.</p>,
    codes: [{ id: "grep-asterisk-single", code: "\\*([^*]+)\\*" }],
  },
  {
    id: "asterisk-double",
    icon: <FileCode size={18} />,
    title: "6. Find Text Enclosed in Double Asterisks",
    description: <p>Matches text wrapped by double asterisks — the markdown bold syntax.</p>,
    codes: [{ id: "grep-asterisk-double", code: "\\*\\*([^*]+)\\*\\*" }],
  },
  {
    id: "roman-numerals",
    icon: <FileCode size={18} />,
    title: "7. Find Roman Numerals",
    description: <p>Locates Roman numeral sequences like chapter numbers or act/scene labels.</p>,
    codes: [{ id: "grep-roman", code: "\\b([IVXLCDM]{2,}|[VXLCDM])\\b" }],
  },
  {
    id: "dialog-tags",
    icon: <FileCode size={18} />,
    title: "8. Google Docs: Proof Dialog Tags",
    description: (
      <p>
        Finds quotation marks that aren&apos;t preceded by <code>]</code> or followed by <code>[</code>, ensuring dialog tags are properly marked.
      </p>
    ),
    codes: [{ id: "grep-google-doc", code: '(?<!] )"(?!\\[)(?=\\S)' }],
  },
];

const scripts: Tool[] = [
  {
    id: "center-titles",
    icon: <Code size={18} />,
    title: "Center Titles Script",
    description: (
      <p>
        Inserts six soft returns before paragraphs with the <code>Title</code> style to help center them on the page.
      </p>
    ),
    codes: [
      {
        id: "center-titles-code",
        code: `// Define the paragraph style name
var titleParagraphStyle = "Title";

// Get the active document
var doc = app.activeDocument;

// Loop through all text frames in the document
for (var i = 0; i < doc.textFrames.length; i++) {
    var textFrame = doc.textFrames[i];

    // Loop through all paragraphs in the text frame
    for (var j = 0; j < textFrame.paragraphs.length; j++) {
        var paragraph = textFrame.paragraphs[j];

        // Check if the paragraph has the paragraph style "Title"
        if (paragraph.appliedParagraphStyle.name == titleParagraphStyle) {
            // Insert 6 soft returns before the title
            paragraph.insertionPoints[0].contents = "\\n\\n\\n\\n\\n\\n";
        }
    }
}

alert("Six soft returns added before all paragraphs with the 'Title' style.");`,
      },
    ],
  },
  {
    id: "auto-master-page",
    icon: <Code size={18} />,
    title: "Auto Apply Master Page for Title Paragraph Style",
    description: (
      <p>
        Checks the active document for pages containing text with the <code>Title</code> paragraph style.
        When found, it applies a designated master page named <code>D-Parent</code> to those pages.
      </p>
    ),
    codes: [
      {
        id: "indesign-script-code",
        code: `var titleParagraphStyle = "Title";
var dParentMasterPageName = "D-Parent";
var doc = app.activeDocument;

if (!doc.saved) {
    alert("Please save the document before running this script.");
} else {
    var pageCount = 0;

    for (var i = 0; i < doc.pages.length; i++) {
        var page = doc.pages[i];
        var containsTitle = false;
        var textFrames = page.textFrames;

        for (var j = 0; j < textFrames.length; j++) {
            var textFrame = textFrames[j];
            var paragraphs = textFrame.paragraphs;
            for (var k = 0; k < paragraphs.length; k++) {
                if (paragraphs[k].appliedParagraphStyle.name == titleParagraphStyle) {
                    containsTitle = true;
                    break;
                }
            }
            if (containsTitle) break;
        }

        if (containsTitle) {
            pageCount++;
            try {
                var masterPage = doc.masterSpreads.itemByName(dParentMasterPageName);
                if (masterPage.isValid) {
                    page.appliedMaster = masterPage;
                } else {
                    alert("Master page '" + dParentMasterPageName + "' is not valid.");
                }
            } catch (e) {
                alert("Error applying master page: " + e);
            }
        }
    }

    alert("Master page '" + dParentMasterPageName + "' applied to " + pageCount + " page(s).");
}`,
      },
    ],
  },
];

export default function GrepToolsClient() {
  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>

        {/* Header */}
        <header className={styles.header}>
          <div className={`badge badge-green ${styles.badge}`}>
            <BookOpen size={12} />
            Publishing Tools
          </div>
          <h1 className={styles.title}>GREP Expressions &amp; InDesign Scripts</h1>
          <p className={styles.desc}>
            A toolbox for editing books in Adobe InDesign. Copy any expression directly into InDesign&apos;s
            Find/Change dialog. When using a replacement value of <code>$1</code>, the expression removes
            formatting markers so you can then apply styles with a hotkey (e.g., <kbd>N + H + F1</kbd> for italics).
          </p>
        </header>

        {/* GREP Section */}
        <section className={styles.section} id="grep-expressions">
          <div className="section-header">
            <h2 className="section-title">GREP Expressions</h2>
          </div>
          <div className={styles.toolGrid}>
            {tools.map((tool) => (
              <article key={tool.id} className={styles.tool} id={tool.id}>
                <div className={styles.toolHeader}>
                  <span className={styles.toolIcon}>{tool.icon}</span>
                  <h3 className={styles.toolTitle}>{tool.title}</h3>
                </div>
                <div className={styles.toolDesc}>{tool.description}</div>
                {tool.codes.map((entry) => (
                  <CodeBlock key={entry.id} entry={entry} />
                ))}
              </article>
            ))}
          </div>
        </section>

        {/* Scripts Section */}
        <section className={styles.section} id="indesign-scripts">
          <div className="section-header">
            <h2 className="section-title">InDesign Scripts</h2>
          </div>
          <div className={styles.toolGrid}>
            {scripts.map((script) => (
              <article key={script.id} className={styles.tool} id={script.id}>
                <div className={styles.toolHeader}>
                  <span className={styles.toolIcon}>{script.icon}</span>
                  <h3 className={styles.toolTitle}>{script.title}</h3>
                </div>
                <div className={styles.toolDesc}>{script.description}</div>
                {script.codes.map((entry) => (
                  <CodeBlock key={entry.id} entry={entry} />
                ))}
              </article>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
