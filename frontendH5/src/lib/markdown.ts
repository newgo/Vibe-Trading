/**
 * 极简 Markdown → HTML 渲染器（H5 瘦版专用）。
 *
 * 安全策略：先整体 HTML 转义，再做结构化替换 —— 输出的所有标签都由本模块
 * 生成，用户内容永远以纯文本形式出现，不存在 XSS 注入面。
 * 瘦版只支持消息流里高频出现的语法：代码块/行内代码/标题/列表/表格/粗斜体/链接。
 */

function escapeHtml(src: string): string {
  return src
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 行内替换（输入已完成转义，URL 中不可能出现引号） */
function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

/** 切分一行 GFM 表格的单元格（容忍省略首尾竖线的写法）。 */
function splitTableRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
}

/** GFM 分隔行：| --- | :---: | ---: |（每格只含冒号与连字符）。 */
function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length >= 1 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

/** 分隔行 → 各列对齐方式。 */
function rowAlignments(line: string): string[] {
  return splitTableRow(line).map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });
}

export function renderMarkdown(src: string): string {
  if (!src) return "";
  const lines = escapeHtml(src).split(/\r?\n/);
  const html: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = (): void => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  // 下标循环：表格分支需要向后消费表体行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      if (inCode) {
        html.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // GFM 表格：当前行含竖线且下一行是分隔行。流式输出中分隔行尚未到达时
    // 仍按普通段落渲染，流完最后一帧即成表（与 PC 版 react-markdown 一致）。
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      closeList();
      const header = splitTableRow(line);
      const aligns = rowAlignments(lines[i + 1]);
      const alignStyle = (col: number): string =>
        `text-align:${aligns[col] ?? "left"}`;
      html.push('<div class="table-wrap"><table><thead><tr>');
      header.forEach((cell, col) =>
        html.push(`<th style="${alignStyle(col)}">${inline(cell)}</th>`),
      );
      html.push("</tr></thead><tbody>");
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        const cells = splitTableRow(lines[i]);
        html.push("<tr>");
        header.forEach((_, col) =>
          html.push(
            `<td style="${alignStyle(col)}">${inline(cells[col] ?? "")}</td>`,
          ),
        );
        html.push("</tr>");
        i += 1;
      }
      html.push("</tbody></table></div>");
      i -= 1; // 抵消外层 for 的 i++，避免跳过表格后的第一行
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }

  if (inCode && codeBuf.length) {
    html.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`);
  }
  closeList();
  return html.join("");
}
