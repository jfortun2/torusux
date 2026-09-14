/**
 * Converts the published Electrochemistry unit from the Torus course export
 * into the prototype's TypeScript data structures.
 *
 * Usage: node scripts/import-electrochemistry.mjs
 * Does not modify files under reference-course/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const EXPORT_DIR = path.join(ROOT, 'reference-course', 'export_real_chem_ii_arrakis_372024__c');
const OUT_FILE = path.join(ROOT, 'src', 'imported', 'electrochemistry.ts');
const UNIT_TITLE = 'Electrochemistry';
const SKIP_RESOURCE_TYPES = new Set(['Survey', 'Feedback', 'Bibentry']);
const SKIP_TITLES = /instructor\s*diar|equity prompt|student survey/i;
const UNSUPPORTED_ACTIVITY = {
  oli_check_all_that_apply: 'Check all that apply',
  oli_short_answer: 'Short answer',
  oli_likert: 'Likert scale',
  oli_ordering: 'Ordering',
  oli_custom_dnd: 'Drag and drop',
  oli_image_coding: 'Image coding',
  oli_image_hotspot: 'Image hotspot',
  oli_adaptive: 'Adaptive activity',
  oli_embedded_video: 'Embedded video activity',
};
const PURPOSE_HEADING = {
  example: 'Example',
  learnbydoing: 'Learn by Doing',
  didigetthis: 'Did I Get This',
  checkpoint: 'Checkpoint',
  labactivity: 'Lab activity',
  manystudentswonder: 'Many Students Wonder',
};

const report = {
  pagesImported: [],
  pagesSkipped: [],
  unsupported: [],
  omitted: [],
  activityCounts: { mcq: 0, multiInput: 0, placeholder: 0 },
  inlinePlaceholders: {},
};

function readJson(id) {
  const file = path.join(EXPORT_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function findUnit(nodes, title) {
  for (const node of nodes || []) {
    if (node.title === title) return node;
    const nested = findUnit(node.children, title);
    if (nested) return nested;
  }
  return null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isBlankHtml(html) {
  return !String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function plainText(htmlOrNodes) {
  if (typeof htmlOrNodes === 'string') {
    return htmlOrNodes.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return slateToHtml(htmlOrNodes, { plain: true }).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function htmlToDisplayText(html) {
  const superMap = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '−': '⁻', n: 'ⁿ' };
  const subMap = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '−': '₋', a: 'ₐ', e: 'ₑ', o: 'ₒ', s: 'ₛ' };
  const mapChars = (value, table) => [...plainText(value)].map((ch) => table[ch] || ch).join('');
  return String(html || '')
    .replace(/<sup>([\s\S]*?)<\/sup>/gi, (_, inner) => mapChars(inner, superMap))
    .replace(/<sub>([\s\S]*?)<\/sub>/gi, (_, inner) => mapChars(inner, subMap))
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function placeholderHtml(contentType, detail = '') {
  report.inlinePlaceholders[contentType] = (report.inlinePlaceholders[contentType] || 0) + 1;
  const extra = detail ? `<p class="page-placeholder__detail">${escapeHtml(detail)}</p>` : '';
  return `<aside class="page-placeholder" data-content-type="${escapeHtml(contentType)}"><p class="page-placeholder__type">${escapeHtml(contentType)}</p><p class="page-placeholder__note">This ${escapeHtml(contentType.toLowerCase())} is not interactive in the prototype.</p>${extra}</aside>`;
}

function latexToHtml(src) {
  if (!src) return '';
  const greek = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ',
    eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
    nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ',
    phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Alpha: 'Α', Beta: 'Β', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ',
    Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Omega: 'Ω',
  };
  let s = String(src);
  const apply = (fn) => { s = fn(s); };
  apply((x) => x.replace(/\\begin\{array\}(?:\{[^}]*\})?/g, ''));
  apply((x) => x.replace(/\\end\{array\}/g, ''));
  apply((x) => x.replace(/\\underline\{([^{}]*)\}/g, '$1'));
  apply((x) => x.replace(/\\mathrm\s*\{([^{}]*)\}/g, '$1'));
  apply((x) => x.replace(/\\text\s*\{([^{}]*)\}/g, '$1'));
  apply((x) => x.replace(/\\textrm\s*\{([^{}]*)\}/g, '$1'));
  apply((x) => x.replace(/\\mathbf\s*\{([^{}]*)\}/g, '$1'));
  apply((x) => x.replace(/\\mathit\s*\{([^{}]*)\}/g, '$1'));
  apply((x) => x.replace(/\\mathrm\s*/g, ''));
  apply((x) => x.replace(/\\text\s*/g, ''));
  apply((x) => x.replace(/\\overline\{([^{}]*)\}/g, '$1'));
  const decorateScripts = (x) =>
    x
      .replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>')
      .replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>')
      .replace(/\^([A-Za-z0-9+\-])/g, '<sup>$1</sup>')
      .replace(/_([A-Za-z0-9])/g, '<sub>$1</sub>');
  const fracs = [];
  apply((x) => x.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
    const token = `§FRAC${fracs.length}§`;
    fracs.push([num, den]);
    return token;
  }));
  apply((x) => x.replace(/\\(?:long)?rightarrow|\\to\b/g, '→'));
  apply((x) => x.replace(/\\(?:long)?leftarrow/g, '←'));
  apply((x) => x.replace(/\\leftrightarrow|\\rightleftharpoons|\\rightleftarrows/g, '⇌'));
  apply((x) => x.replace(/\\times/g, '×'));
  apply((x) => x.replace(/\\cdot/g, '·'));
  apply((x) => x.replace(/\^\\circ/g, '°'));
  apply((x) => x.replace(/\\circ/g, '°'));
  apply((x) => x.replace(/\^°/g, '°'));
  apply((x) => x.replace(/\\degree/g, '°'));
  apply((x) => x.replace(/\\infty/g, '∞'));
  apply((x) => x.replace(/\\pm/g, '±'));
  apply((x) => x.replace(/\\approx/g, '≈'));
  apply((x) => x.replace(/\\neq|\\ne\b/g, '≠'));
  apply((x) => x.replace(/\\leq|\\le\b/g, '≤'));
  apply((x) => x.replace(/\\geq|\\ge\b/g, '≥'));
  apply((x) => x.replace(/\\ln\b/g, 'ln'));
  apply((x) => x.replace(/\\log\b/g, 'log'));
  apply((x) => x.replace(/\\ldots|\\dots/g, '…'));
  apply((x) => x.replace(/\\%/g, '%'));
  apply((x) => x.replace(/\\,|\\;|\\:|\\!/g, ' '));
  apply((x) => x.replace(/\\quad/g, '  '));
  apply((x) => x.replace(/\\qquad/g, '    '));
  apply((x) => x.replace(/~/g, ' '));
  apply((x) => x.replace(/\\left|\\right|\\displaystyle|\\limits/g, ''));
  Object.entries(greek).forEach(([name, ch]) => {
    s = s.replace(new RegExp(`\\\\${name}\\b`, 'g'), ch);
  });
  apply(decorateScripts);
  apply((x) => x.replace(/\\\\/g, '<br>'));
  apply((x) => x.replace(/\\([a-zA-Z]+)/g, ''));
  apply((x) => x.replace(/[{}]/g, ''));
  fracs.forEach(([num, den], index) => {
    s = s.replace(
      `§FRAC${index}§`,
      `<span class="page-frac"><span class="page-frac-num">${decorateScripts(num)}</span><span class="page-frac-den">${decorateScripts(den)}</span></span>`,
    );
  });
  return s.replace(/\s+/g, ' ').trim();
}

function safeImageSrc(src) {
  if (!src || typeof src !== 'string') return '';
  if (/^https:\/\/d2xvti2irp4c7t\.cloudfront\.net\//i.test(src)) return src;
  if (/^https:\/\//i.test(src) && !/javascript:/i.test(src)) return src;
  return '';
}

function slateToHtml(nodes, options = {}) {
  const list = Array.isArray(nodes) ? nodes : nodes ? [nodes] : [];
  return list.map((node) => nodeToHtml(node, options)).join('');
}

function nodeToHtml(node, options = {}) {
  if (node == null) return '';
  if (typeof node === 'string') return options.plain ? escapeHtml(node) : escapeHtml(node);
  if (typeof node !== 'object') return '';
  if (node.text != null && !node.type) {
    let text = escapeHtml(node.text);
    if (options.plain) return text;
    if (node.em) text = `<em>${text}</em>`;
    if (node.italic) text = `<em>${text}</em>`;
    if (node.strong || node.bold) text = `<strong>${text}</strong>`;
    if (node.underline) text = `<u>${text}</u>`;
    if (node.sub) text = `<sub>${text}</sub>`;
    if (node.sup) text = `<sup>${text}</sup>`;
    if (node.term) text = `<span class="page-keyword">${text}</span>`;
    if (node.code) text = `<code>${text}</code>`;
    return text;
  }

  const children = slateToHtml(node.children || node.content || [], options);
  const type = node.type;

  if (options.plain) return children;

  if (type === 'p') {
    if (isBlankHtml(children) && !node.children?.some((child) => child.type && child.type !== 'text')) {
      return '';
    }
    return `<p>${children}</p>`;
  }
  if (type === 'h1' || type === 'h2' || type === 'h3' || type === 'h4' || type === 'h5') {
    return `<${type}>${children}</${type}>`;
  }
  if (type === 'ul' || type === 'ol' || type === 'li') return `<${type}>${children}</${type}>`;
  if (type === 'a') {
    const href = typeof node.href === 'string' && /^(https?:|mailto:|#)/i.test(node.href) ? node.href : '';
    return href ? `<a href="${escapeHtml(href)}">${children || escapeHtml(href)}</a>` : children;
  }
  if (type === 'img') {
    const src = safeImageSrc(node.src);
    if (!src) {
      return placeholderHtml('Image', node.alt || 'Remote image could not be displayed safely.');
    }
    const alt = escapeHtml(node.alt || '');
    const caption = node.caption ? `<figcaption>${escapeHtml(plainText(node.caption))}</figcaption>` : '';
    return `<figure class="page-figure"><img src="${escapeHtml(src)}" alt="${alt}" />${caption}</figure>`;
  }
  if (type === 'formula' || type === 'formula_inline') {
    const rendered = latexToHtml(node.src || '');
    const tag = type === 'formula' ? 'div' : 'span';
    const cls = type === 'formula' ? 'page-formula page-formula--block' : 'page-formula';
    return rendered
      ? `<${tag} class="${cls}">${rendered}</${tag}>`
      : placeholderHtml('Formula', node.src || '');
  }
  if (type === 'table') return `<div class="page-table-wrap"><table class="page-table">${children}</table></div>`;
  if (type === 'thead' || type === 'tbody' || type === 'tr' || type === 'td' || type === 'th' || type === 'caption') {
    return `<${type}>${children}</${type}>`;
  }
  if (type === 'dl') return `<dl class="page-dl">${children}</dl>`;
  if (type === 'dt') return `<dt>${children}</dt>`;
  if (type === 'dd') return `<dd>${children}</dd>`;
  if (type === 'callout') {
    return `<aside class="page-callout">${children || '<p>Note</p>'}</aside>`;
  }
  if (type === 'popup') {
    const body = plainText(node.content || node.children || []);
    const trigger = children || 'term';
    return `<span class="page-keyword page-popup" tabindex="0" title="${escapeHtml(body)}">${trigger}</span>`;
  }
  if (type === 'page_link') {
    return renderPageLink(node, children);
  }
  if (type === 'youtube') {
    return placeholderHtml('YouTube video', node.src ? `Video id ${node.src}` : '');
  }
  if (type === 'audio' || type === 'video') return placeholderHtml(type === 'audio' ? 'Audio' : 'Video');
  if (type === 'iframe' || type === 'webpage') return placeholderHtml('External webpage');
  if (type === 'conjugate_pair' || type === 'dialog' || type === 'citation') {
    return placeholderHtml(type.replace(/_/g, ' '));
  }
  if (type === 'break' || type === 'selection' || type === 'text') return children;
  if (type === 'content' || type === 'group') return children;
  if (type === 'input_ref') return '<span class="page-input-ref">_____</span>';
  if (type === 'activity-reference') return '';
  if (!type) return children;
  return children || placeholderHtml(String(type).replace(/_/g, ' '));
}

function firstHeading(html, fallback) {
  const match = String(html).match(/<h[1-5][^>]*>([\s\S]*?)<\/h[1-5]>/i);
  if (match) return plainText(match[1]) || fallback;
  return fallback;
}

function headingFromHtml(html, fallback) {
  const fromTag = firstHeading(html, '');
  if (fromTag) return fromTag;
  const text = plainText(html);
  if (/adapted from/i.test(text)) return 'Source';
  if (/^key terms/i.test(text)) return 'Key Terms';
  if (/^key equations/i.test(text)) return 'Key Equations';
  return fallback;
}

function stripHeading(html) {
  return String(html).replace(/<h[1-5][^>]*>[\s\S]*?<\/h[1-5]>/i, '');
}

function renderPageLink(node, children) {
  const purpose = String(node.purpose || '').toLowerCase();
  if (purpose === 'myresponse' || purpose === 'survey') {
    return placeholderHtml('Survey', 'Instructor or student response form');
  }
  const idref = String(node.idref || node.idRef || '');
  const target = pageIndex.get(idref);
  if (target) {
    const label = children && !isBlankHtml(children) ? children : escapeHtml(target.title);
    return `<a class="page-internal-link" href="#page-${escapeHtml(idref)}">${label}</a>`;
  }
  if (idref) {
    const resource = readJson(idref);
    if (resource && (SKIP_RESOURCE_TYPES.has(resource.type) || SKIP_TITLES.test(resource.title || ''))) {
      report.omitted.push({ id: idref, title: resource.title, reason: `Linked ${resource.type || 'resource'} excluded` });
      return placeholderHtml(resource.type === 'Survey' ? 'Survey' : 'Page link', resource.title);
    }
    return placeholderHtml('Page link', resource?.title || idref);
  }
  return children || placeholderHtml('Page link');
}

const pageIndex = new Map();

function collectHierarchyPages(node, trail = []) {
  const items = [];
  const nextTrail = node.title ? [...trail, node.title] : trail;
  if (node.type === 'item' && node.idref) {
    items.push({ id: String(node.idref), trail: nextTrail, parentTitle: trail[trail.length - 1] || UNIT_TITLE });
  }
  for (const child of node.children || []) {
    items.push(...collectHierarchyPages(child, nextTrail));
  }
  return items;
}

function extractContainers(node, type) {
  const result = [];
  const walk = (current, inheritedType) => {
    const currentType = current.id && current.title && current.type === 'container' ? inheritedType : inheritedType;
    if (current.id && current.title && current.type === 'container') {
      result.push({ id: String(current.id), title: current.title, type: currentType, children: current.children || [] });
    }
    (current.children || []).forEach((child) => walk(child, currentType));
  };
  walk(node, type);
  return result;
}

function cleanBankTitle(title) {
  return String(title || 'Activity bank')
    .replace(/^Legacy Pool:\s*/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function selectionTagId(selection) {
  const value = selection?.logic?.conditions?.children?.[0]?.value;
  if (Array.isArray(value) && value.length) return String(value[0]);
  if (value != null) return String(value);
  return '';
}

function countBankedForTag(tagId, tagCounts) {
  return tagCounts.get(String(tagId)) || 0;
}

function buildTagCounts() {
  const counts = new Map();
  for (const file of fs.readdirSync(EXPORT_DIR)) {
    if (!file.endsWith('.json') || file.startsWith('_')) continue;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, file), 'utf8'));
    } catch {
      continue;
    }
    if (data?.type !== 'Activity' || data.scope !== 'banked') continue;
    for (const tag of data.tags || []) {
      const key = String(tag);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

function slatePrompt(stem) {
  const html = slateToHtml(stem?.content || stem || []);
  return htmlToDisplayText(html).replace(/_{5,}/g, '_____') || 'Question';
}

function choiceText(choice) {
  const html = slateToHtml(choice.content || choice.children || []);
  const text = htmlToDisplayText(html);
  if (text) return text;
  const formula = JSON.stringify(choice).match(/"src":\s*"((?:\\.|[^"\\])*)"/);
  return formula ? htmlToDisplayText(latexToHtml(formula[1].replace(/\\\\/g, '\\'))) : 'Option';
}

function feedbackText(part, correct) {
  const texts = [];
  for (const response of part?.responses || []) {
    const score = Number(response.score) || 0;
    if (correct && score <= 0) continue;
    if (!correct && score > 0) continue;
    const text = plainText(slateToHtml(response.feedback?.content || []));
    if (text) texts.push(text);
  }
  if (!correct) {
    for (const hint of part?.hints || []) {
      const text = plainText(slateToHtml(hint.content || []));
      if (text) texts.push(`Hint: ${text}`);
    }
  }
  return texts.join(' ');
}

function convertActivity(activityId, loLabel) {
  const activity = readJson(activityId);
  if (!activity) {
    report.omitted.push({ id: String(activityId), reason: 'Activity JSON missing from export' });
    return placeholderBlock(`missing-${activityId}`, 'Missing activity', 'Activity');
  }
  if (activity.type === 'Survey' || SKIP_TITLES.test(activity.title || '')) {
    report.omitted.push({ id: activity.id, title: activity.title, reason: 'Survey or instructor diary excluded' });
    return placeholderBlock(`activity-${activity.id}`, activity.title || 'Survey', 'Survey');
  }
  const subType = activity.subType || '';
  if (subType === 'oli_multiple_choice') return convertMcq(activity, loLabel);
  if (subType === 'oli_multi_input') return convertMultiInput(activity, loLabel);
  const label = UNSUPPORTED_ACTIVITY[subType] || subType.replace(/^oli_/, '').replace(/_/g, ' ') || 'Unsupported activity';
  report.activityCounts.placeholder += 1;
  report.unsupported.push({
    pageId: currentPageId,
    activityId: activity.id,
    title: activity.title,
    contentType: label,
  });
  return placeholderBlock(`activity-${activity.id}`, activity.title || label, label);
}

function placeholderBlock(id, title, contentType) {
  return {
    id: String(id),
    kind: 'placeholder',
    origin: 'canonical',
    status: 'original',
    title: title || contentType,
    placeholder: {
      contentType,
      summary: title && title !== contentType ? title : '',
    },
  };
}

function convertMcq(activity, loLabel) {
  const choices = activity.content?.choices || [];
  const part = activity.content?.authoring?.parts?.[0] || {};
  const correctIds = new Set(
    (part.responses || []).filter((response) => Number(response.score) > 0).flatMap((response) => {
      const match = String(response.rule || '').match(/\{([^}]+)\}/);
      return match && match[1] !== '.*' ? [match[1]] : [];
    }),
  );
    const mapped = choices.map((choice, index) => ({
    id: `${activity.id}-${choice.id || index}`,
    text: choiceText(choice),
    correct: correctIds.has(String(choice.id)),
  }));
  if (!mapped.some((choice) => choice.correct) && mapped.length) {
    const legacy = (part.responses || []).find((response) => Number(response.score) > 0)?.legacyMatch;
    const hit = mapped.find((choice) => String(choice.id).endsWith(`-${legacy}`));
    if (hit) hit.correct = true;
  }
  report.activityCounts.mcq += 1;
  const prompt = slatePrompt(activity.content?.stem);
  return {
    id: `activity-${activity.id}`,
    kind: 'question',
    origin: 'canonical',
    status: 'original',
    title: prompt.slice(0, 80) || activity.title || 'Multiple choice',
    question: {
      kind: 'mcq',
      title: prompt.slice(0, 80) || activity.title || 'Multiple choice',
      prompt,
      points: 1,
      learningObjective: loLabel,
      choices: mapped,
      inputs: [],
      correctFeedback: feedbackText(part, true) || 'Correct.',
      incorrectFeedback: feedbackText(part, false) || 'Incorrect.',
    },
  };
}

function convertMultiInput(activity, loLabel) {
  const inputs = activity.content?.inputs || [];
  const parts = activity.content?.authoring?.parts || [];
  const choicesById = new Map((activity.content?.choices || []).map((choice) => [String(choice.id), choice]));
  const mappedInputs = inputs.map((input, index) => {
    const part = parts.find((item) => item.id === input.partId || item.id === input.id) || parts[index] || {};
    const correct = (part.responses || []).find((response) => Number(response.score) > 0);
    const match = String(correct?.rule || '').match(/\{([^}]+)\}/);
    const choiceId = match?.[1] || '';
    const choice = choicesById.get(choiceId);
    const answer = choice ? choiceText(choice) : choiceId.replace(/^.*_/, '');
    const stemHtml = slateToHtml(activity.content?.stem?.content || []);
    const labelFromStem = guessInputLabel(stemHtml, input.id) || input.id || `Input ${index + 1}`;
    return {
      id: `${activity.id}-${input.id || index}`,
      label: labelFromStem,
      answer: answer || '',
    };
  });
  report.activityCounts.multiInput += 1;
  const prompt = slatePrompt(activity.content?.stem);
  const allPartsFeedback = (correct) =>
    parts.map((part) => feedbackText(part, correct)).filter(Boolean).join(' ');
  return {
    id: `activity-${activity.id}`,
    kind: 'question',
    origin: 'canonical',
    status: 'original',
    title: prompt.slice(0, 80) || activity.title || 'Multi-input',
    question: {
      kind: 'multi-input',
      title: prompt.slice(0, 80) || activity.title || 'Multi-input',
      prompt,
      points: Math.max(1, mappedInputs.length),
      learningObjective: loLabel,
      choices: [],
      inputs: mappedInputs,
      correctFeedback: allPartsFeedback(true) || 'Correct.',
      incorrectFeedback: allPartsFeedback(false) || 'Incorrect.',
    },
  };
}

function guessInputLabel(stemHtml, inputId) {
  const text = plainText(stemHtml);
  if (/oxidation/i.test(text) && String(inputId).includes('first')) return 'Oxidation';
  if (/reduction/i.test(text) && String(inputId).includes('second')) return 'Reduction';
  if (/anode/i.test(text) && /cathode/i.test(text)) {
    if (String(inputId).includes('first')) return 'Anode';
    if (String(inputId).includes('second')) return 'Cathode';
  }
  return '';
}

let currentPageId = '';
let currentLo = '';
const objectiveById = new Map();
const objectiveCodeById = new Map();

function emitContentChildren(children, loLabel) {
  const blocks = [];
  let htmlParts = [];
  const flush = (heading) => {
    const html = htmlParts.join('');
    htmlParts = [];
    if (isBlankHtml(html)) return;
    const title = heading || headingFromHtml(html, pageIndex.get(currentPageId)?.title || 'Explanation');
    blocks.push({
      id: `text-${currentPageId}-${blocks.length + 1}`,
      kind: 'text',
      origin: 'canonical',
      status: 'original',
      title,
      text: {
        heading: title,
        bodyHtml: html.includes('<h') ? stripHeading(html) : html,
        learningObjective: loLabel,
      },
    });
  };

  for (const child of children || []) {
    if (!child || typeof child !== 'object') continue;
    if (child.audience === 'instructor') {
      report.omitted.push({ id: child.id, pageId: currentPageId, reason: 'Instructor-only content excluded' });
      continue;
    }
    if (child.type === 'activity-reference') {
      flush();
      blocks.push(convertActivity(child.activity_id, loLabel));
      continue;
    }
    if (child.type === 'break') continue;
    htmlParts.push(nodeToHtml(child));
  }
  flush();
  return blocks;
}

function convertModel(model, loLabel) {
  const blocks = [];
  for (const node of model || []) {
    if (!node || typeof node !== 'object') continue;
    if (node.audience === 'instructor') {
      report.omitted.push({ id: node.id, pageId: currentPageId, reason: 'Instructor-only content excluded' });
      continue;
    }
    if (node.type === 'selection') {
      blocks.push(convertSelection(node, loLabel));
      continue;
    }
    if (node.type === 'activity-reference') {
      blocks.push(convertActivity(node.activity_id, loLabel));
      continue;
    }
    if (node.type === 'group') {
      blocks.push(...convertGroup(node, loLabel));
      continue;
    }
    if (node.type === 'content') {
      blocks.push(...emitContentChildren(node.children || [], loLabel));
      continue;
    }
    const html = nodeToHtml(node);
    if (!isBlankHtml(html)) {
      const title = firstHeading(html, 'Explanation');
      blocks.push({
        id: `text-${node.id || blocks.length}`,
        kind: 'text',
        origin: 'canonical',
        status: 'original',
        title,
        text: { heading: title, bodyHtml: html, learningObjective: loLabel },
      });
    }
  }
  return dedupeEmpty(blocks);
}

function convertGroup(node, loLabel) {
  const purpose = String(node.purpose || 'none');
  if (purpose === 'example') {
    const innerHtml = slateToHtml(collectNonActivityNodes(node));
    const title = firstHeading(innerHtml, PURPOSE_HEADING.example);
    const blocks = [{
      id: `example-${node.id}`,
      kind: 'example',
      origin: 'canonical',
      status: 'original',
      title,
      example: {
        heading: title,
        bodyHtml: innerHtml.includes('<h') ? stripHeading(innerHtml) : innerHtml,
      },
    }];
    const activities = findActivities(node);
    activities.forEach((activityId) => blocks.push(convertActivity(activityId, loLabel)));
    return blocks;
  }
  if (purpose === 'learnbydoing' || purpose === 'didigetthis') {
    const heading = PURPOSE_HEADING[purpose];
    const introHtml = slateToHtml(collectNonActivityNodes(node));
    const blocks = [];
    if (!isBlankHtml(introHtml)) {
      blocks.push({
        id: `text-${node.id}`,
        kind: 'text',
        origin: 'canonical',
        status: 'original',
        title: heading,
        text: { heading, bodyHtml: introHtml, learningObjective: loLabel },
      });
    } else {
      blocks.push({
        id: `text-${node.id}`,
        kind: 'text',
        origin: 'canonical',
        status: 'original',
        title: heading,
        text: { heading, bodyHtml: `<p>${heading}</p>`, learningObjective: loLabel },
      });
    }
    findActivities(node).forEach((activityId) => blocks.push(convertActivity(activityId, loLabel)));
    return blocks;
  }
  return convertModel(node.children || [], loLabel);
}

function collectNonActivityNodes(node) {
  const collected = [];
  const walk = (current) => {
    if (!current || typeof current !== 'object') return;
    if (current.type === 'activity-reference' || current.type === 'selection') return;
    if (current.type === 'content') {
      const kids = (current.children || []).filter((child) => child.type !== 'activity-reference' && child.type !== 'break');
      collected.push(...kids);
      return;
    }
    if (current.type === 'group') {
      (current.children || []).forEach(walk);
      return;
    }
    if (current.type && current.type !== 'group') collected.push(current);
  };
  (node.children || []).forEach(walk);
  return collected;
}

function findActivities(node, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (node.type === 'activity-reference' && node.activity_id) acc.push(node.activity_id);
  const kids = node.children || node.content?.model || [];
  if (Array.isArray(kids)) kids.forEach((child) => findActivities(child, acc));
  return acc;
}

function convertSelection(node, loLabel) {
  const tagId = selectionTagId(node);
  const tag = tagId ? readJson(tagId) : null;
  const title = cleanBankTitle(tag?.title || 'Activity bank');
  const count = Number(node.count) || 1;
  return {
    id: `bank-${node.id}`,
    kind: 'bank',
    origin: 'canonical',
    status: 'original',
    title,
    bank: {
      selectionId: String(node.id),
      numberToSelect: count,
      availableQuestions: countBankedForTag(tagId, tagCounts),
      criteriaTag: tag?.title || title,
    },
  };
}

function dedupeEmpty(blocks) {
  return blocks.filter((block) => {
    if (block.kind === 'text') return !isBlankHtml(block.text.bodyHtml) || Boolean(block.text.heading);
    if (block.kind === 'example') return !isBlankHtml(block.example.bodyHtml) || Boolean(block.example.heading);
    return true;
  });
}

function uniqueIds(blocks) {
  const seen = new Map();
  return blocks.map((block) => {
    const base = String(block.id || 'block');
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return n === 0 ? block : { ...block, id: `${base}-${n + 1}` };
  });
}

function blockKindForCurriculum(kind) {
  if (kind === 'example') return 'example';
  if (kind === 'question') return 'question';
  if (kind === 'bank') return 'bank';
  return 'explanation';
}

function shouldSkipPage(resource) {
  if (!resource) return { skip: true, reason: 'Missing resource JSON' };
  if (SKIP_RESOURCE_TYPES.has(resource.type)) return { skip: true, reason: `${resource.type} excluded` };
  if (SKIP_TITLES.test(resource.title || '')) return { skip: true, reason: 'Instructor diary or survey excluded' };
  if (resource.type !== 'Page') return { skip: true, reason: `Unsupported type ${resource.type}` };
  return { skip: false };
}

function loLabelFor(id) {
  const code = objectiveCodeById.get(String(id));
  const title = objectiveById.get(String(id)) || '';
  return code ? `${code} ${title}` : title;
}

const tagCounts = buildTagCounts();

function main() {
  const hierarchy = readJson('_hierarchy');
  if (!hierarchy) throw new Error('Missing _hierarchy.json');
  const unit = findUnit(hierarchy.children, UNIT_TITLE);
  if (!unit) throw new Error('Electrochemistry unit not found in hierarchy');

  const hierarchyItems = collectHierarchyPages(unit);
  hierarchyItems.forEach((item) => {
    const resource = readJson(item.id);
    pageIndex.set(item.id, { title: resource?.title || item.id, trail: item.trail });
  });

  const usedObjectiveIds = [];
  for (const item of hierarchyItems) {
    const resource = readJson(item.id);
    for (const id of resource?.objectives || []) {
      const key = String(id);
      if (!usedObjectiveIds.includes(key)) usedObjectiveIds.push(key);
    }
  }
  usedObjectiveIds.sort((a, b) => Number(a) - Number(b));
  let n = 1;
  for (const id of usedObjectiveIds) {
    const obj = readJson(id);
    objectiveById.set(id, obj?.title || `Objective ${id}`);
    while (n === 4 || n === 5) n += 1;
    objectiveCodeById.set(id, `LO 1.${n}`);
    n += 1;
  }

  const pages = {};
  const banks = {};
  const moduleNodes = (unit.children || []).filter((child) => child.type === 'container');
  const unitPages = (unit.children || []).filter((child) => child.type === 'item' && child.idref);

  function convertPage(idref) {
    const id = String(idref);
    currentPageId = id;
    const resource = readJson(id);
    const skip = shouldSkipPage(resource);
    if (skip.skip) {
      report.pagesSkipped.push({ id, title: resource?.title, reason: skip.reason });
      return null;
    }
    const objIds = (resource.objectives || []).map(String);
    const labels = objIds.map(loLabelFor).filter(Boolean);
    currentLo = labels[0] || '';
    const layout = /checkpoint/i.test(resource.title || '') ? 'checkpoint' : 'lesson';
    const scoring = resource.isGraded ? 'scored' : 'practice';
    const blocks = uniqueIds(convertModel(resource.content?.model || [], currentLo));
    const pageBanks = [];
    blocks.forEach((block) => {
      if (block.kind !== 'bank') return;
      const selectionId = block.bank.selectionId;
      pageBanks.push({
        id: selectionId,
        title: block.title,
        availableQuestions: block.bank.availableQuestions || 0,
        numberToSelect: block.bank.numberToSelect || 1,
        criteriaTag: block.bank.criteriaTag || block.title,
        learningObjective: currentLo,
      });
      banks[selectionId] = pageBanks[pageBanks.length - 1];
    });
    pages[id] = {
      id,
      title: resource.title,
      scoring,
      layout,
      objectiveCodes: objIds.map((objId) => objectiveCodeById.get(objId)).filter(Boolean),
      objectiveLabels: labels,
      bankIds: pageBanks.map((bank) => bank.id),
      blocks,
    };
    report.pagesImported.push({
      id,
      title: resource.title,
      scoring,
      layout,
      blocks: blocks.length,
      questions: blocks.filter((block) => block.kind === 'question').length,
      banks: pageBanks.length,
      placeholders: blocks.filter((block) => block.kind === 'placeholder').length,
    });
    return pages[id];
  }

  function pageCurriculumNode(page) {
    return {
      id: `page-${page.id}`,
      type: 'page',
      title: page.title,
      originalTitle: page.title,
      origin: 'canonical',
      status: 'original',
      assessmentTitle: page.title,
      pageScoring: page.scoring,
      learningObjectives: page.objectiveLabels,
      children: page.blocks.map((block) => ({
        id: `c-${block.id}`,
        type: 'block',
        title: block.title,
        originalTitle: block.title,
        origin: 'canonical',
        status: 'original',
        blockKind: blockKindForCurriculum(block.kind),
        learningObjectives: page.objectiveLabels,
        children: [],
      })),
    };
  }

  const unitChildren = [];
  for (const child of unit.children || []) {
    if (child.type === 'item' && child.idref) {
      const page = convertPage(child.idref);
      if (page) unitChildren.push(pageCurriculumNode(page));
      continue;
    }
    if (child.type === 'container') {
      const modulePages = [];
      for (const item of child.children || []) {
        if (item.type === 'item' && item.idref) {
          const page = convertPage(item.idref);
          if (page) modulePages.push(pageCurriculumNode(page));
        }
      }
      unitChildren.push({
        id: `module-${child.id}`,
        type: 'module',
        title: child.title,
        originalTitle: child.title,
        origin: 'canonical',
        status: 'original',
        children: modulePages,
      });
    }
  }

  const curriculumUnit = {
    id: `unit-${unit.id}`,
    type: 'unit',
    title: unit.title,
    originalTitle: unit.title,
    origin: 'canonical',
    status: 'original',
    children: unitChildren,
  };

  const learningObjectives = usedObjectiveIds.map((id) => ({
    id,
    code: objectiveCodeById.get(id),
    label: objectiveById.get(id),
  }));

  const banner = `/**\n * Generated by scripts/import-electrochemistry.mjs from the course export.\n * Do not edit by hand. Re-run the importer after export changes.\n */\n`;
  const body = `${banner}export const ELECTROCHEMISTRY_LEARNING_OBJECTIVES = ${JSON.stringify(learningObjectives, null, 2)} as const;\n\nexport const ELECTROCHEMISTRY_UNIT = ${JSON.stringify(curriculumUnit, null, 2)};\n\nexport const ELECTROCHEMISTRY_PAGES: Record<string, ImportedPage> = ${JSON.stringify(pages, null, 2)};\n\nexport const ELECTROCHEMISTRY_BANKS: Record<string, ImportedBank> = ${JSON.stringify(banks, null, 2)};\n\nexport const ELECTROCHEMISTRY_IMPORT_REPORT = ${JSON.stringify(report, null, 2)};\n\nexport type ImportedBank = {\n  id: string;\n  title: string;\n  availableQuestions: number;\n  numberToSelect: number;\n  criteriaTag: string;\n  learningObjective: string;\n};\n\nexport type ImportedPage = {\n  id: string;\n  title: string;\n  scoring: 'scored' | 'practice';\n  layout: 'lesson' | 'checkpoint';\n  objectiveCodes: string[];\n  objectiveLabels: string[];\n  bankIds: string[];\n  blocks: unknown[];\n};\n`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, body);
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`Pages imported: ${report.pagesImported.length}`);
  console.log(`Pages skipped: ${report.pagesSkipped.length}`);
  console.log(`Questions: mcq=${report.activityCounts.mcq} multi-input=${report.activityCounts.multiInput} placeholders=${report.activityCounts.placeholder}`);
  console.log('Inline placeholders', report.inlinePlaceholders);
}

main();
